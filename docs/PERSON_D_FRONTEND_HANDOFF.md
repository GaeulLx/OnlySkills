# Person D frontend handoff: website goal queue

The backend now has an asynchronous queue for website-submitted goals. Please add it to the existing OnlySkill app without replacing the current Team-up screen or changing `/api/state` and `/api/join`.

## API base URL

Use `https://onlyskills.onrender.com` by default. Keep the existing runtime override (`ONLYSKILLS_API_BASE_URL`) if already configured.

## Submit goal

Send the user's prompt to `POST /api/chat`:

```js
const response = await fetch(`${API}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: goal, budget, currency })
});
const submission = await response.json();
if (!response.ok) throw new Error(submission.error || 'Could not submit goal');
```

The response is HTTP 202 and includes `runId`, `status`, `statusUrl`, and `resultsUrl`. Show an immediate **OnlySkills** system message that the goal is queued. Do not label that acknowledgement as WorkBuddy.

## Show real progress and results

Poll `GET ${API}/api/runs/${encodeURIComponent(runId)}` about every 2.5 seconds. Append only unseen `events`; mark an event as WorkBuddy-generated only when `event.source === 'workbuddy'`. Prevent overlapping requests and stop polling on `awaiting_approval`, `approved`, `rejected`, or `failed`, and when the user leaves the workflow screen.

The response fields are:

- `status`: `queued`, `running`, `awaiting_approval`, `approved`, `rejected`, or `failed`
- `events`: progress entries with `step`, `detail`, `source`, and `at`
- `result`: `null` until validation succeeds; then it contains `businessAnalyst`, `growth`, `teamBuilder`, `operations`, `feedback`, `recommendation`, `artifacts`, and `validation`
- `error`: present when status is `failed`

When the run reaches `awaiting_approval`, render the deliverables and recommendation, and provide Approve/Reject controls. Submit the decision to the existing `POST /api/approve` API with `{ runId, actionId, approved }`, where `actionId` is `result.recommendation.actionId`. Show the returned status. This endpoint records the decision only; it does not execute outside actions.

## States and errors

- `queued`: show that the WorkBuddy worker has not claimed the goal yet.
- `running`: show actual event updates and a waiting indicator.
- `awaiting_approval`: show results and ask the user to approve or reject.
- `failed`: show the backend's `error` and offer a retry that submits a new run.
- Handle 404, network errors, and Render cold-start delay with a clear retry message.

Do not fabricate progress or results. WorkBuddy Desktop must be connected and have its queue-worker task running, or the goal will remain queued. Keep the existing provider/demo-data disclosure and existing Team-up behavior.
