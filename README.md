# OnlySkills backend

The current website source is in [`website/`](website/README.md). It is kept as a separate project so its Cloudflare Worker, D1 migrations, and frontend dependencies do not replace this backend's Express/MCP service.

OnlySkills exposes a remote MCP server so **WorkBuddy is the primary agent and execution engine**. WorkBuddy Desktop can run a goal entered in its own screen, or act as a pre-started worker that claims a website-submitted goal from the OnlySkills queue. WorkBuddy plans the steps, calls OnlySkills tools for demo context and validated calculations, creates the cost spreadsheet and marketing document with WorkBuddy's own document tools, then asks OnlySkills to validate and save the structured results.

CodeBuddy is not used by this workflow. The backend does not call a WorkBuddy model API; WorkBuddy connects outward to this MCP server over authenticated HTTPS.

## MCP tools

- `get_onlyskills_context`: returns server-calculated summary KPIs and three clearly labeled synthetic student creator profiles.
- `calculate_business_case`: returns the authoritative illustrative cost, unit economics, and break-even calculations.
- `claim_next_run`: lets a WorkBuddy Desktop worker claim a goal submitted from the website.
- `update_run_progress`: records actual WorkBuddy milestones for the website timeline.
- `validate_and_save_workflow`: checks all five agent outputs and records results plus WorkBuddy artifact references in Firebase or memory.
- `fail_run`: records why a claimed website goal could not be completed.
- `record_recommendation_decision`: records an explicit approval/rejection. It does not make purchases or contact anyone.

The backend validates calculations and result structure. It records WorkBuddy's artifact references but cannot independently verify that WorkBuddy files exist or inspect their full contents. Use WorkBuddy's native file/document features to create those files.

## Local setup

Use Node.js 22 or newer. In PowerShell, open this project folder in VS Code, then in its terminal run:

```powershell
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Generate a private MCP token and add it to `.env` as `MCP_AUTH_TOKEN=<generated-value>`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep the token secret. Do not commit `.env`, paste the token into chat, or add it to the frontend. Start the API:

```powershell
$env:PORT = "3002"
npm.cmd run dev
```

`http://127.0.0.1:3002/mcp/health` reports whether the MCP endpoint has a token configured. For WorkBuddy to connect, the server must be reachable via HTTPS; localhost is not reachable from WorkBuddy's remote service.

## Deploy to Render

1. Push the backend changes to the GitHub repository connected to the Render Web Service. Keep the service's existing root directory and start command (`npm start`).
2. In Render → service → **Environment**, add `MCP_AUTH_TOKEN` as a secret. Generate it locally with the command above and use the same value in WorkBuddy's MCP authentication settings. Do not put it in GitHub or frontend configuration.
3. Deploy the service and open `https://onlyskills.onrender.com/mcp/health`. It should return `ok: true`, `transport: "streamable-http"`, and `authenticationConfigured: true`.
4. In WorkBuddy, open **Settings → MCP → Add MCP Server**. Configure the remote URL as `https://onlyskills.onrender.com/mcp`, choose Streamable HTTP, and configure bearer-token authentication with the `MCP_AUTH_TOKEN` value. WorkBuddy's UI labels can vary; use its documented URL-based remote MCP configuration.
5. Confirm WorkBuddy shows the server connected and lists the OnlySkills tools. Then paste the relevant demo prompt below into a WorkBuddy conversation.

If Render currently reports `persistence: "memory"`, saved runs disappear when the service restarts. Configure Firebase Admin credentials on Render to use Firestore; never put service-account credentials in browser code or Git.

## One-prompt demo

Paste this into WorkBuddy after the MCP server is connected:

```text
Run the OnlySkills workflow end to end for this goal: Plan a small reusable bottle business for university students with a maximum starting budget of MYR 500.

Act as the orchestrator. Keep the run concise and do not ask me to guide intermediate steps. First call `get_onlyskills_context` and `calculate_business_case` in parallel. Then use WorkBuddy specialist agents to do Business Analyst, Growth, Team Builder, and Operations work in parallel if available. Give each agent only the relevant goal and tool output; do not repeat raw sales data. Have Feedback use the completed results to suggest one evidence-based next step. Use the server's calculated figures as the source of truth. Treat KPIs and creator profiles as synthetic demo data; label assumptions and never claim a forecast, quote, confirmed creator, or real transaction.

Create two concise, usable deliverables with WorkBuddy's native document tools: (1) `OnlySkills_Cost_Model.xlsx`, one worksheet with assumptions, budget allocation, unit economics, break-even, and sell-out sensitivity; and (2) `OnlySkills_Growth_Plan.docx`, one page with three short social posts and a three-day content calendar. Save both under `C:\Users\ASUS\WorkBuddy AI\OnlySkills` and note their exact titles and locations. Avoid decorative research or extra sections.

Before finishing, cross-check the costs, budget, saleable stock, break-even figures, mock Operations metrics, and completeness of both deliverables. Call validate_and_save_workflow with all five structured results and references to both files. If a tool fails, inspect the error and retry once when safe; if it still fails, disclose the blocker. If validation reports issues, correct the results and retry. Report the run ID, validation outcome, artifact titles/locations, key findings, and approval action ID. Then stop and wait for my explicit approval or rejection. Do not spend money, contact students, or claim to execute any outside action.
```

After WorkBuddy presents the results, reply clearly with **approve** or **reject**. WorkBuddy should then call `record_recommendation_decision` using the run ID and action ID it returned.

## Existing REST API

The dashboard REST API remains available:

- `GET /api/health`
- `POST /api/chat` — queue a goal for a connected WorkBuddy Desktop worker; returns immediately with a run ID.
- `GET /api/runs/:runId` — read queue status, WorkBuddy progress events, and saved results.
- `POST /api/goal` — deterministic mock flow for dashboard compatibility.
- `GET /api/status?runId=<uuid>`
- `GET /api/results?runId=<uuid>`
- `POST /api/approve`

`POST /api/goal` remains a deterministic mock flow. For the website-submitted WorkBuddy flow, use `POST /api/chat` and start the separate queue-worker task in WorkBuddy Desktop. This lets the website submit goals, but WorkBuddy Desktop must already be connected and waiting; it is not a direct WorkBuddy Open API integration. The backend has no CodeBuddy or OpenAI provider; requests naming either provider are rejected.

For the website queue flow, API response shapes, and a reusable WorkBuddy worker prompt, see [`docs/WEBSITE_QUEUE.md`](docs/WEBSITE_QUEUE.md). Person D's frontend handoff is in [`docs/PERSON_D_FRONTEND_HANDOFF.md`](docs/PERSON_D_FRONTEND_HANDOFF.md). The worker must be started in WorkBuddy Desktop before website goals can be picked up; this uses the existing MCP integration, not the WorkBuddy Open API.

## Firebase

The backend already supports Firebase Admin/Cloud Firestore. It uses Firestore when `FIREBASE_PROJECT_ID` and server-side credentials are configured; otherwise it uses temporary in-memory storage. The Admin SDK must only run on the backend, never in the frontend.

### Set up Firebase and Render

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project for OnlySkills (or use an existing project you control).
2. In that project, create a **Cloud Firestore** database using the **Production** rules option. The backend uses the default database and creates its `runs` and `actions` collections when the first workflow is saved.
3. Open **Project settings → Service accounts** and generate a private key for the Firebase Admin SDK. Keep the downloaded JSON private. It grants server-side access to your Firestore data.
4. In Render, open the OnlySkills backend service → **Environment**. Add `FIREBASE_PROJECT_ID` with the Firebase project ID, and add `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the complete contents of the downloaded JSON file. Mark the credential value as secret if Render offers that option.
5. Save and redeploy the Render service. Open `https://onlyskills.onrender.com/api/health`; confirm it reports `persistence: "firebase"`.
6. Run one WorkBuddy workflow, note its run ID, and verify that the OnlySkills results page can still retrieve it after a Render redeploy/restart.

For local development, either set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file stored outside this repository, or set `GOOGLE_APPLICATION_CREDENTIALS_JSON` in a private local `.env`. Never commit `.env` or the service-account file. Firebase security rules for browser clients do not replace protecting this Admin SDK credential; the backend credential has privileged access.

## Project map

```text
src/server.js       Express REST routes and MCP route registration
src/mcpServer.js    Authenticated Streamable HTTP MCP tools for WorkBuddy
src/agents.js       Deterministic calculations and REST demo agents
src/store.js        Firestore persistence with in-memory fallback
src/data/           Synthetic demo sales and student profiles
docs/               Technical explanation and WorkBuddy demo prompt
```
