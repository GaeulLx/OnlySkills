# OnlySkills backend (mock-first)

This is a small Node.js/Express API for the hackathon demo. Deterministic mock agents remain the default. An optional CodeBuddy Agent SDK provider can generate the Business Analyst result when explicitly selected; the other agents remain deterministic mocks. This is a documented CodeBuddy runtime integration, not a call to the current WorkBuddy desktop conversation. Your account's edition, entitlement, runtime, and authentication still need confirmation. Tencent Docs document creation/read/write uses separate APIs and permissions and is not connected here.

## 1. Create the project locally

Open VS Code, select **File → Open Folder**, and choose the existing `skillbridge-backend` folder inside the OnlySkills project folder. Open **Terminal → New Terminal**; the terminal should be in `skillbridge-backend`.

In Command Prompt, run:

```powershell
node --version
npm --version
npm install
if not exist .env copy .env.example .env
npm run dev
```

Use Node.js 20 or newer. The server should print that it is listening on the configured port. Visit `/api/health`; expected response includes `"ok":true` and `"persistence":"memory"`. Memory mode resets when the server restarts and is the fastest first milestone.

## Optional CodeBuddy Agent SDK

The SDK is optional, so mock mode can still run if the SDK package or account access is unavailable. The official SDK documentation labels it Preview. This adapter denies every tool-use request and asks for text analysis only; it does not use permission bypass, execute commands, or create/edit files.

1. Confirm with the hackathon organizer that your account/edition is authorized for CodeBuddy Agent SDK use and which runtime/authentication method to use. Public documentation does not establish hackathon entitlements or credits.
2. Install the package in the backend folder with `npm install`. Install and authenticate the compatible CodeBuddy CLI if your edition's SDK setup requires it.
3. Use an organizer-approved API key in a local environment variable, or authenticate through the official CLI. Never commit credentials or put them in frontend code. For China edition, official SDK docs specify `CODEBUDDY_INTERNET_ENVIRONMENT=internal`; other editions use different values.
4. Set `AGENT_PROVIDER=codebuddy` in `.env`, restart the backend, and submit a goal. Alternatively pass `"provider":"codebuddy"` in an individual `/api/goal` request. The API response reports whether CodeBuddy ran or deterministic fallback was used.
5. Selecting CodeBuddy sends the submitted goal and budget to CodeBuddy. Use non-sensitive demo data until your team approves the account and data handling.

Without a configured SDK/runtime or valid account, CodeBuddy mode returns a clearly marked deterministic fallback. A real model request may take longer than the mock flow. Do not describe the backend as AI-powered unless the response reports `provider: "codebuddy"`.

After authorization is confirmed, first run the text-only SDK smoke example with `node invoke-agent.mjs`. It prints a JSON object containing the SDK session ID and result. The Express adapter uses the same SDK controls, a 90-second default abort timeout (`CODEBUDDY_TIMEOUT_MS`), `maxTurns: 3`, plan permission mode, and a callback that denies tool requests. A timeout or invalid JSON result is reported as `mock_fallback` in the goal response.

The official CodeBuddy Code documentation also describes a **Beta local HTTP API** (`codebuddy --serve`) with agent runs, status and event-stream routes. It is a different local-service integration and has broad file/process capabilities protected by authentication. This backend does not connect to that service. Do not disable its authentication or expose it to a network; only consider it after the organizer approves using that specific runtime.

## 2. Firebase setup (after the mock flow works)

1. In the Firebase Console, create/select a project and enable **Cloud Firestore** in test/development mode for your hackathon project.
2. Open **Project settings → Service accounts → Generate new private key** only if permitted by your team. Save the downloaded JSON somewhere outside this project, for example `C:\Users\YOURNAME\AppData\Local\OnlySkills\service-account.json`.
3. Never commit or send that key to the frontend, Person D, or chat. This project's `.gitignore` excludes service-account files, but storing it outside the project is safer.
4. Copy `.env.example` to `.env` if you have not already. Set `FIREBASE_PROJECT_ID` to your Firebase project ID and set `GOOGLE_APPLICATION_CREDENTIALS` to the full path of the JSON file. In PowerShell `.env`, use a path such as `C:\Users\YOURNAME\AppData\Local\OnlySkills\service-account.json`.
5. Stop and restart the server. `/api/health` should report `firebase`. Firestore collections `runs` and `actions` are created automatically when first written. The sample sales and creators are currently local mock data in `src/data/mockData.js`.
6. Restrict Firestore access and rotate/revoke the key if it is accidentally exposed. For a deployed backend, prefer the hosting provider's service identity / Application Default Credentials rather than uploading a key file.

You do not need to create Firestore collections by hand. Do not use Firebase client configuration or Admin credentials in a browser app. The Admin SDK belongs only in this backend.

## 3. Run the full demo flow

Keep `npm run dev` running. In a second VS Code terminal, use PowerShell:

```powershell
$run = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/goal -ContentType 'application/json' -Body '{"goal":"Sell a reusable water bottle to university students","budget":500,"currency":"MYR","productDescription":"reusable water bottle","targetCustomer":"university students"}'
$run
Invoke-RestMethod -Uri "http://localhost:3000$($run.statusUrl)"
Invoke-RestMethod -Uri "http://localhost:3000$($run.resultsUrl)"
$approval = @{ runId = $run.runId; actionId = $run.recommendation.actionId; approved = $true } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/approve -ContentType 'application/json' -Body $approval
```

The response to goal creation contains the run ID, provider, status/results URLs, and approval action ID. With the default mock provider, all five finish deterministically in one request. If CodeBuddy is explicitly selected, only Business Analyst uses the SDK; Growth, Team Builder, Operations, and Feedback remain mock agents. Approval records the user's decision only; it does not spend money, contact students, or execute an external action.

## API contract for Person D

Base URL during local development: `http://localhost:3000` (or the port configured in `.env`). Optional request field `provider` may be `mock` or `codebuddy`; default is `AGENT_PROVIDER` in `.env`, otherwise `mock`.

### `POST /api/goal`

Request:

```json
{
  "goal": "Sell a reusable water bottle to university students",
  "budget": 500,
  "currency": "MYR",
  "productDescription": "reusable water bottle",
  "targetCustomer": "university students"
}
```

Success `201`:

```json
{
  "runId": "<uuid>",
  "status": "awaiting_approval",
  "provider": "mock",
  "providerNote": "Deterministic mock agents used.",
  "statusUrl": "/api/status?runId=<uuid>",
  "resultsUrl": "/api/results?runId=<uuid>",
  "recommendation": {
    "finding": "...",
    "recommendation": "...",
    "requiresApproval": true,
    "actionId": "improve-conversion-<uuid>"
  }
}
```

### `GET /api/status?runId=<uuid>`

Returns `{ runId, status, agents, updatedAt }`. Each agent has `status` (`completed` in this mock run) and `result`.

### `GET /api/results?runId=<uuid>`

Returns `{ runId, goal, results, recommendation }`. Result keys are `businessAnalyst`, `growth`, `teamBuilder`, `operations`, and `feedback`.

### `POST /api/approve`

Request `{ "runId": "<uuid>", "actionId": "<actionId returned by POST /api/goal>", "approved": true }`. `approved` must be a boolean. Returns status `approved` or `rejected`.

Errors use `{ "error": "..." }`: `400` invalid/missing input, `404` unknown run/action, `500` server error. `GET /api/health` reports readiness and persistence mode. CORS allows `http://localhost:5173` by default; set `FRONTEND_ORIGIN` to Person D's local frontend origin.

## Folder map

```text
src/
  server.js             Express API routes
  agents.js             Deterministic Business Analyst, Growth, Team Builder, Operations, Feedback
  store.js              Firestore when configured; in-memory fallback otherwise
  workbuddyAdapter.js   Manual-only WorkBuddy/Tencent Docs boundary
  codebuddyAdapter.js   Optional CodeBuddy SDK Business Analyst; tool requests denied
  invoke-agent.mjs     Standalone text-only SDK smoke example (requires approved access)
  data/mockData.js      20 mock sales rows and 3 mock student creators
docs/
  WORKBUDDY_PROMPTS.md  Prompts to paste into WorkBuddy manually
  TECHNICAL_OVERVIEW.md Short demo/technical explanation
```

## Before presenting

Run the flow several times with fresh goals. Confirm health, goal creation, status, results, and both approval decisions. Check that Person D uses the same field names and status strings. In the demo, distinguish mock agents from a successful CodeBuddy SDK run. Tencent Docs artifacts remain manual until separate API credentials and document permissions are configured and verified.
