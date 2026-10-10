# OnlySkills backend: demo explanation

The demo uses a Node.js/Express API. `POST /api/goal` validates a goal, creates a run, and passes the inputs through five modules: Business Analyst, Growth, Team Builder, Operations, and Feedback. The default provider uses deterministic mock logic. If CodeBuddy is explicitly selected and correctly configured, only the Business Analyst result uses the optional CodeBuddy Agent SDK; the remaining agents stay deterministic mocks. The server returns structured results with an approval-required recommendation. `GET /api/status` and `GET /api/results` let the frontend display progress and output. `POST /api/approve` records an explicit human decision; it does not execute outside actions.

Persistence uses Firebase Admin/Cloud Firestore when the backend has server-side credentials; otherwise it falls back to in-memory storage for quick local development. Never put Firebase Admin credentials in frontend code. The mock sales rows and student profiles are demo data and are not real users or transactions.

CodeBuddy SDK and Tencent Docs are separate integrations. SDK support is documented, but hackathon account entitlement and credentials need confirmation. The SDK adapter denies all tool calls and requests text analysis only. Tencent Docs create/read/write APIs need separate credentials and permissions and are not yet called by this backend. WorkBuddy website artifacts are still created manually.

## Honest demo claims

- The end-to-end goal → structured results → recommendation → approval loop works locally.
- Growth, Team Builder, Operations, Feedback, sales, and creator records are deterministic mocks, not live marketplace data.
- CodeBuddy is active only when explicitly selected and the response reports `provider: "codebuddy"`; fallback is identified distinctly.
- Firebase persistence is active only when `/api/health` reports `firebase`.
- Tencent Docs documents are not created by this backend.
