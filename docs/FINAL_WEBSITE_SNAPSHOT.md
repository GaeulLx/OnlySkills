# Final OnlySkills website snapshot

This branch saves the source of the separate deployed venture workspace in `website/`. The repository's existing Render backend files are unchanged.

- Public website: https://onlyskills-venture-workspace.li895.chatgpt.site/
- Snapshot date: 2026-10-11 (Asia/Kuala_Lumpur)
- Published site version: 8
- Exact website source commit: `34c02324001d8fd1f4c4b2477b8d8c6b469a2a4a`
- Backend base: https://onlyskills.onrender.com
- Backend base override: Worker runtime variable `ONLYSKILLS_API_BASE_URL`
- GitHub base commit: `fd9b2fa4668cbf0d97715f4b553b6912426a73b5` on `main`

The 50 original tracked source files are copied unchanged. This includes the Worker-served HTML/JavaScript, branding and fonts, migrations, package lockfile, tests, and notices. Build output, dependencies, browser data, live database records, receipt uploads, and credentials are not included. Test fixtures are isolated test data, not real users or AI results.

## Current flow

New devices start with Profile, then AI Workspace. Successful recommendation approval opens Teammates. Matching requires one Product Creator, one Marketing member, and one Sales member, with all three accepting before activation. The app retains the interactive teammate map, role-specific tasks, group chat, shared team bookkeeping, and existing WorkBuddy result lookup. Agent result details are expandable and preserve actual returned fields. Matching scores profiles deterministically; WorkBuddy progress depends on the external worker and backend events, not simulated progress.

Some older acceptance documents in the source describe earlier designs; they are retained as historical source material. The startup flow above and the executable tests describe the latest update.

## Verify locally

From `website/`:

```sh
pnpm install --frozen-lockfile
node tests/agent-workspace.mjs
node tests/interactions.mjs
node tests/smoke.mjs
node tests/matching.mjs
node tests/bookkeeping.mjs
node tests/constellation.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

Use a recent Node.js release with `node:sqlite` support. The database tests use isolated SQLite fixtures and do not alter the hosted database.

## Hosting safety

`website/.openai/hosting.json` intentionally records the existing workspace site's project ID and `DB` / `BUCKET` bindings. This snapshot upload does not deploy or change that site. To publish a different site, create a new project and new bindings first; do not deploy this saved project ID to create a separate site.

Render's `FRONTEND_ORIGIN` for the current workspace is `https://onlyskills-venture-workspace.li895.chatgpt.site` with no trailing slash. Merely saving this branch needs no Render environment change. Never commit Firebase service-account credentials, MCP bearer tokens, or other secrets.
