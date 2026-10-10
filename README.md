# OnlySkills backend

OnlySkills exposes a remote MCP server so **WorkBuddy is the primary agent and execution engine**. A user enters one goal in WorkBuddy; WorkBuddy plans the steps, calls OnlySkills tools for demo context and validated calculations, creates the cost spreadsheet and marketing document with WorkBuddy's own document tools, then asks OnlySkills to validate and save the structured results. The REST endpoints remain available for the dashboard and deterministic demo flow.

CodeBuddy is not used by this workflow. The backend does not call a WorkBuddy model API; WorkBuddy connects outward to this MCP server over authenticated HTTPS.

## MCP tools

- `get_onlyskills_context`: returns server-calculated summary KPIs and three clearly labeled synthetic student creator profiles.
- `calculate_business_case`: returns the authoritative illustrative cost, unit economics, and break-even calculations.
- `validate_and_save_workflow`: checks all five agent outputs and records results plus WorkBuddy artifact references in Firebase or memory.
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
5. Confirm WorkBuddy shows the server connected and lists the four OnlySkills tools. Then paste the demo prompt below into a WorkBuddy conversation.

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
- `POST /api/goal` — deterministic mock flow for dashboard compatibility.
- `GET /api/status?runId=<uuid>`
- `GET /api/results?runId=<uuid>`
- `POST /api/approve`

The REST flow is not the WorkBuddy-led judging demo. Use the WorkBuddy conversation connected to `/mcp` for that demonstration. The backend has no CodeBuddy or OpenAI provider; requests naming either provider are rejected.

## Firebase

The API uses Firebase Admin/Cloud Firestore when server-side credentials are configured; otherwise it uses memory mode. In Render, prefer a protected service identity or server-side secret. For local development, store a service-account JSON outside the repository and set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`. The Admin SDK must never run in the frontend.

## Project map

```text
src/server.js       Express REST routes and MCP route registration
src/mcpServer.js    Authenticated Streamable HTTP MCP tools for WorkBuddy
src/agents.js       Deterministic calculations and REST demo agents
src/store.js        Firestore persistence with in-memory fallback
src/data/           Synthetic demo sales and student profiles
docs/               Technical explanation and WorkBuddy demo prompt
```
