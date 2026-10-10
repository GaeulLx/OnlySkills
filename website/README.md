# OnlySkills

A minimal three-phone venture matcher with personal task plans, a goal workflow, and receipt bookkeeping.

## Flow

1. Open the same public link on three phones.
2. In Matching (the default page), each person enters their name, one position (Product Creator, Marketing, or Sales), skills, interests, business goal, and availability.
3. Matching scores eligible three-role combinations. All three people review and accept the invitation to activate the team. Each phone then sees only its own three task phases and eighteen detailed steps, plus the shared three-person group chat.

No account, manual demo start, reset button, or admin panel is required. The Site uses shared D1 records. Keep browser storage for the phone identity; do not enter sensitive information. The obsolete Team-up UI and its polling are removed. Legacy `/api/state`, `/api/join`, and `/api/group/message` routes and records remain for compatibility; no old user or bookkeeping data is deleted.

Matching uses deterministic profile similarity, not a live AI model. Detailed tasks are suggested role-based work breakdowns, not fabricated AI analysis or completed business results.

## Matching workflow

Teammates includes a movable venture mind map: drag the idea, role symbols, or member cards, or use arrow keys on a focused node. Connectors follow each move; layouts are saved only in the current browser, separately for compact and wide views. Reset map restores the arrangement. The radar runs only while a saved profile is opted in and waiting for a team; it reports actual available-profile counts, pauses when offscreen, and has a Pause radar control and reduced-motion support. Moving a node changes its display position only.

The **Matching** tab is an additive, profile-based team matcher. Visitors submit their real demo profile (name, one role, skills, interests, business goal, hours, and availability slots). The Worker ranks only complete triples with exactly one Product Creator, one Marketing member, and one Sales member. Scoring combines role-skill fit and skill coverage (35%), shared interests (20%), goal similarity (30%), and availability (15%). The displayed component scores come from these submitted profiles; no sample members are created and no live LLM is claimed.

The app saves proposals and decisions in D1. Each proposed team reserves three devices until everyone accepts or the team is rejected/cancelled. All three acceptances are required before activation; the D1 check constraint requires three role-acceptance flags, updated atomically. The same team gets a shared three-person group chat. Messages persist in D1, are limited to 1,000 characters, and are visible/sendable only to accepted members of that active team. Cancellation closes chat access and releases members; the initiating/rejecting device pauses until it resubmits.

Personal task state is filtered by owner in backend SQL, not merely hidden in HTML. Each member has three phases with six steps each. Every step has instructions, a concrete completion output and suggested effort. `POST /api/matching/task-step` accepts `{deviceId, stepId, completed}`; updates require accepted membership of an active team and ownership of the parent task. The Worker atomically recomputes the parent phase. Expanded phase controls use native accessible details/summary, and each checkbox saves to D1 with progress and retry. The old `/api/matching/task` endpoint remains compatible and updates all steps of the member's own phase consistently.

Migration `0006_organic_maria_hill.sql` adds `matching_task_steps`; existing applied migrations are unchanged. Bounded idempotent expansion runs for the actual member's active tasks. Existing completed parent tasks seed completed child steps, preserving prior progress. No sample users or task completions are inserted into production. The checklist installs the small MIT TodoMVC event-delegation source module at fixed commit `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`, adapted in `worker/checklist.js`, not the upstream standalone app or its localStorage persistence. Attribution is in `THIRD_PARTY_NOTICES.md` and the browser source.

The chosen demo identity is the browser's UUID in local storage. It prevents one browser/device from holding two active or pending team seats, but it is not account authentication: the same person can use another phone or clear browser storage to appear as a different demo user. Profiles are visible to visitors using the public Site, so do not enter sensitive information.

The matching implementation adapts the general TF-IDF/cosine similarity and constrained role-triple ranking approach identified in the MIT-licensed AI Hackathon Team Maker; it does not install that repository's React/FastAPI app or copy its application code. The second researched repository is not used because its source has no clear reuse license.

To test matching locally, run `node tests/matching.mjs`. It executes the additive migrations in SQLite and exercises valid/invalid triples, proposal creation, accept/reject/cancel, database activation constraints, one-device reservation, saved task ownership/completion, and group-chat access and message validation.

## Goal workflow

The **Goal workflow** tab is an additional page in the same Worker-served app. It calls the OnlySkills API directly from the browser: `GET /api/health`, `POST /api/chat` to queue a goal for WorkBuddy Desktop, `GET /api/runs/:runId` for status/progress/results, and `POST /api/approve` for the user decision. While the Goal workflow page is open, status is checked every 2.5 seconds; polling pauses when the user leaves that page and stops at approval, rejection, or failure. It does not use a proxy or send credentials.

The Worker runtime variable `ONLYSKILLS_API_BASE_URL` can override the API origin. When unset, the app uses `https://onlyskills.onrender.com`. Do not put API keys or service-account credentials in the browser. A goal stays queued until the WorkBuddy Desktop MCP worker claims it. The progress panel displays backend events and labels an event as WorkBuddy only when the backend marks its source as `workbuddy`. Creator profiles and sales/KPI values may be synthetic demo data, and approval only records a decision.

If the browser reports a CORS error, set the Render service's `FRONTEND_ORIGIN` to the deployed frontend origin: `https://onlyskill-student-ventures.li895.chatgpt.site`.

To verify, open **Goal workflow**, wait for the health status, submit a goal (only Goal is required), and confirm it first appears as queued. With the WorkBuddy Desktop worker active, watch its progress events, then review the five agent cards and recommendation. Use **Approve** or **Reject** and confirm the response status/message. Matching is the default tab; Bookkeeping remains available.

The same page also has **View WorkBuddy results** for an existing `runId`. It makes a direct `GET /api/results?runId=...` to the configured API origin and renders the returned goal, five agent results, recommendation, artifact titles/locations, and validation status. A missing ID is rejected locally; an unknown ID gets a not-found message. This lookup never calls `POST /api/goal` and sends no MCP bearer token. `node tests/smoke.mjs` covers a successful lookup response and an unknown ID.

## Receipt bookkeeping

The additive **Bookkeeping** tab adapts the MIT-licensed [Receipt Scanner](https://github.com/anupshah/receipt-scanner) preprocessing/OCR workflow and installs pinned Tesseract.js 7.0.0 and PDF.js 5.5.207. It does not install a replacement Vite app, copy UK VAT calculations, or use an external paid AI API. Reuse and licenses are documented in `THIRD_PARTY_NOTICES.md` and shipped at `/assets/bookkeeping-licenses.txt`.

Bookkeeping offers only **Shared team books** in the interface. Once a complete team is available, each transaction saved there—including its note and receipt—is visible to all three current team members. The ledger identifies the contributor by name and role and shows per-member income, expenses, and balance, grouped by currency (no conversion). Each member can void only their own entries. Existing personal entries are retained but are not shown or moved into the shared team ledger. Upload JPG/PNG/WebP/PDF up to 8 MB (PDF extraction supports up to 8 pages), review the suggested merchant/date/total, select income/expense, confirm the fields, and save. PDFs use native text or page OCR; no fabricated values are inserted when extraction fails. You can also enter a transaction manually. D1 stores reviewed cashbook entries and R2 `BUCKET` stores attachments. CSV export includes the audit status; voiding an owned entry preserves its row but removes it from totals. There is no invented conversion, double-entry accounting, tax filing, or bank connection.

Bookkeeping requests carry a random browser capability key bound to the existing device ID; only its hash is stored by the Worker. Keep the original browser storage to retain access. This is still demo identity, not verified account authentication; do not store sensitive financial receipts. Team scopes are available only to current members of complete teams, and cancellation/idle expiry closes access to that group's ledger and receipts. OCR runs on-device. Library/worker assets are served from OnlySkills; the pinned Tesseract WASM and language models download from the upstream public CDN without sending receipt images.

Verification: `node tests/bookkeeping.mjs` tests actual SQLite migrations with a private in-memory R2 fixture, authorization, exact cents, upload checks, review validation, idempotent retries, team membership/expiry, CSV escaping, and void audit. Legacy routes and current Matching checks must also pass.

## Local checks

```powershell
node scripts/build.mjs
node scripts/validate.mjs
node tests/smoke.mjs
node tests/constellation.mjs
node tests/matching.mjs
node tests/bookkeeping.mjs
```

The database schema is in `db/schema.ts`; generate migrations with `pnpm run db:generate`. The build bundles those migrations under `dist/.openai/drizzle`, where the Site deployment can apply them before the Worker starts.
