# Website-to-WorkBuddy queue

This flow lets the OnlySkills website submit a goal to the backend while WorkBuddy Desktop, already connected to the OnlySkills MCP server, claims and executes it. It does not call WorkBuddy's Open API and does not work with WorkBuddy Web unless that version can connect to custom MCP servers.

## Flow

1. The website sends `POST /api/chat` with `{ "message": "...", "budget": 500, "currency": "MYR" }`.
2. The backend stores a run with `status: "queued"` and returns its `runId` immediately.
3. A WorkBuddy Desktop task calls the MCP tool `claim_next_run`. It can wait up to 20 seconds for a queued goal. Claiming is atomic in Firestore; a claim expires after ten minutes without progress, so another worker can retry it.
4. WorkBuddy reports actual milestones through `update_run_progress`. The website reads these at `GET /api/runs/:runId`.
5. WorkBuddy calls `validate_and_save_workflow` with the same `runId`, all five results, and both WorkBuddy artifact references. The backend validates and stores them against the queued run. The run becomes `awaiting_approval` and the response includes its `actionId`.
6. The website displays the results and can use the existing `POST /api/approve` endpoint for the explicit decision.

The queued workflow needs Firebase persistence on Render. With `persistence: "memory"`, the queue and run results can disappear on restart or when the service sleeps.

## API contract

### Submit a goal

`POST /api/chat`

```json
{
  "message": "Plan a small reusable bottle business for university students",
  "budget": 500,
  "currency": "MYR"
}
```

Returns HTTP 202 with `runId`, `status: "queued"`, `statusUrl`, and `resultsUrl`.

### Get queue status, progress, and result

`GET /api/runs/:runId`

The response includes `status`, `events`, and `result`. Each event has `step`, `detail`, `source`, and `at`. `source: "workbuddy"` is only added by MCP progress/result tools. A result is `null` until validation succeeds. A completed workflow is `awaiting_approval` until the user records a decision.

The website may poll every 2.5 seconds. It should stop polling for `awaiting_approval`, `approved`, `rejected`, or `failed`; render the result for `awaiting_approval`; and show `error` for `failed`. The existing `GET /api/results?runId=...` endpoint remains available for the results-only view.

## WorkBuddy Desktop worker prompt

Start this as a separate WorkBuddy Desktop task before the demo. Leave that task running while using the OnlySkills website. WorkBuddy may stop a long-running conversation or tool loop; verify that it remains active before relying on it live.

```text
Act as the OnlySkills website queue worker. Stay active until I tell you to stop.

Repeatedly call the OnlySkills MCP tool claim_next_run with waitSeconds set to 15. If it returns available:false, call it again. Do not invent a goal. When it returns a goal, use its runId, goal, budget, and currency for the workflow.

For each claimed run:
1. Call update_run_progress with the runId to report that you are planning the work.
2. Call get_onlyskills_context and calculate_business_case in parallel, using the claimed budget and currency.
3. Produce Business Analyst, Growth, Team Builder, Operations, and Feedback results. Use WorkBuddy's own document tools to create a cost spreadsheet and marketing plan under `C:\Users\ASUS\WorkBuddy AI\OnlySkills`. Clearly label the sales and creator data as synthetic.
4. Report real milestones using update_run_progress. Do not claim a step is complete before doing it.
5. Cross-check the calculations and completeness of both files. Call validate_and_save_workflow with the same runId, the claimed goal, budget, currency, all five structured results, and references to both files. If validation returns problems, correct the output and retry.
6. Report the runId, validation status, result summary, file titles and locations, and approval actionId. Do not approve or reject for the user.
7. Return to waiting for the next website goal. If a run cannot be completed, call fail_run with its runId and a short accurate explanation, then continue waiting.

Do not spend money, contact creators, or claim to take outside actions. Stop only when I explicitly tell you to stop.
```

## Notes

- `POST /api/chat` is a public endpoint. Keep it to a demo environment or add user authentication/rate limits before opening it broadly.
- WorkBuddy Desktop must stay connected to the deployed MCP server. If its worker task stops, queued runs remain queued until a worker claims them.
- Queue and progress are durable only when `/api/health` reports `persistence: "firebase"`.
- The website's queued message is from OnlySkills. Label progress events as WorkBuddy only when their `source` is `workbuddy`.
- The website should handle request failures and 404s, and stop its polling timer when the user navigates away.
