# OnlySkills backend

This Node.js/Express API uses OpenAI by default for all five planning agent results. The OpenAI key is read only by the backend from `OPENAI_API_KEY`; it is never returned to the client. `provider: "mock"` remains available only for explicitly requested local demos. OpenAI failures return an error and never silently fall back to mock content. The model defaults to `gpt-4.1-mini` and can be changed with the server-side `OPENAI_MODEL` variable.

## Deploy to Render

1. Create a Render **Web Service** connected to the repository and set its root directory to `skillbridge-backend`.
2. Use Node.js 22 or newer. Build command: `npm install`; start command: `npm start`.
3. In the Render service's **Environment** settings, add `OPENAI_API_KEY` with the API key from your OpenAI Platform project. Optionally set `OPENAI_MODEL` (default `gpt-4.1-mini`) and `FRONTEND_ORIGIN` to the deployed frontend origin.
4. Deploy. Check `/api/health`, then submit a goal to `POST /api/goal` without a provider field. A successful response should report `provider: "openai"`; the key must never be added to frontend environment variables or source code.
5. If the service reports quota/rate-limit errors, check the OpenAI project billing and usage limits. Invalid or missing keys are reported as errors; the service does not pretend a demo result is AI output.

`gpt-4.1-mini` is a supported model, and the backend uses the official `openai` JavaScript SDK with the Responses API. See [OpenAI's official JavaScript SDK](https://github.com/openai/openai-node) and [model documentation](https://developers.openai.com/api/docs/models/gpt-4.1).

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

Use Node.js 22 or newer. The server should print that it is listening on the configured port. Visit `/api/health`; expected response includes `"ok":true` and `"persistence":"memory"`. Memory mode resets when the server restarts and is the fastest first milestone.

## Local environment

Set `OPENAI_API_KEY` in the backend `.env` file for live model calls. Keep `.env` out of source control and never expose the key in the frontend.

The model receives the submitted goal, budget, currency, product description, and target customer. It is instructed not to invent real student profiles or campaign metrics; when no actual activity data is supplied, the operations result reports zero metrics and explains that measurement data is missing.

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

The response to goal creation contains the run ID, provider, status/results URLs, and approval action ID. By default, all five planning results come from OpenAI. The explicit mock provider is available for local demos. Approval records the user's decision only; it does not spend money, contact students, or execute an external action.

## API contract for Person D

Base URL during local development: `http://localhost:3000` (or the port configured in `.env`). Optional request field `provider` may be `openai` or `mock`; default is always `openai`. Remove any stale `AGENT_PROVIDER` variable from Render; only an explicit request-level `provider: "mock"` selects demo output.

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
  "provider": "openai",
  "providerNote": "All planning agents generated by OpenAI.",
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

Returns `{ runId, status, agents, updatedAt }`. Each agent has `status: "completed"` and `result`.

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
  openaiAdapter.js      OpenAI Responses API provider and result validation
  invoke-agent.mjs     Standalone text-only SDK smoke example (requires approved access)
  data/mockData.js      20 mock sales rows and 3 mock student creators
docs/
  WORKBUDDY_PROMPTS.md  Prompts to paste into WorkBuddy manually
  TECHNICAL_OVERVIEW.md Short demo/technical explanation
```

## Before presenting

Run the flow several times with fresh goals. Confirm health, goal creation, status, results, and both approval decisions. Check that Person D uses the same field names and status strings. In the demo, distinguish mock agents from a successful CodeBuddy SDK run. Tencent Docs artifacts remain manual until separate API credentials and document permissions are configured and verified.
