# OnlySkills backend: demo explanation

The Node.js/Express API defaults `POST /api/goal` to the CodeBuddy Agent SDK for Business Analyst output. Growth, Team Builder, Operations, and Feedback use deterministic agent logic. The SDK is restricted to text analysis and denies tool requests. If CodeBuddy fails, the response identifies `mock_fallback`. An optional `provider: "openai"` runs all five through the OpenAI Responses API; `OPENAI_API_KEY` stays on the backend. An explicit `provider: "mock"` selects deterministic demo results. The API returns an approval-required recommendation. `GET /api/status` and `GET /api/results` let the frontend display progress and output. `POST /api/approve` records an explicit human decision; it does not execute outside actions.

The mock Business Analyst follows the reconciled workbook's illustrative MYR base case: 20 bottles purchased, one retained as a demo, 19 maximum saleable, MYR 12 product cost, MYR 1 packing, MYR 20 draft price, 2% plus MYR 0.10 illustrative payment fees, MYR 80 marketing, MYR 20 printing, MYR 40 pickup setup, and MYR 90 held contingency. The modeled allocation is MYR 499.50 against a MYR 500 cap. Operating contribution break-even is 24 sales, and the full-reserve cash recovery hurdle is 26 sales; both exceed the 19-unit saleable ceiling. These are planning assumptions and sell-out sensitivities, not verified quotes, purchase approval, or a demand forecast. The budget input is compared against the fixed base case; estimated affordable stock is not a sales forecast.

Persistence uses Firebase Admin/Cloud Firestore when the backend has server-side credentials; otherwise it falls back to in-memory storage for quick local development. Never put Firebase Admin credentials in frontend code. The mock sales rows and student profiles are demo data and are not real users or transactions.

CodeBuddy SDK and Tencent Docs are separate integrations. SDK support is documented, but hackathon account entitlement and credentials need confirmation. The SDK adapter denies all tool calls and requests text analysis only. Tencent Docs create/read/write APIs need separate credentials and permissions and are not yet called by this backend. WorkBuddy website artifacts are still created manually.

## Honest demo claims

- The end-to-end goal → structured results → recommendation → approval loop works locally.
- If the user supplies no campaign metrics or student profiles, generated Operations results report no measured activity and Team Builder suggests roles without inventing actual people.
- Successful CodeBuddy Business Analyst output reports `provider: "codebuddy"`; failure fallback reports `provider: "mock_fallback"`. Explicit mock and OpenAI modes report their selected provider.
- Firebase persistence is active only when `/api/health` reports `firebase`.
- Tencent Docs documents are not created by this backend.
