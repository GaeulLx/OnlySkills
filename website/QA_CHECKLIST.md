# OnlySkills demo acceptance matrix

Use this as a release gate for the local, static demonstration. `P0` blocks the core loop; `P1` is required for a credible initial demo. Record evidence as a screenshot, stored-state excerpt, or exact observed value—never as “looks OK.”

## Workflow and connected-state acceptance

| ID | Pri | Acceptance condition | Deterministic check |
|---|---:|---|---|
| W01 | P0 | The first usable screen asks exactly **“What is your role?”** and presents exactly three prominent choices: **Product Creator**, **Marketing**, and **Sales**. | Clear storage, reload, count the role cards, and select each role once. |
| W02 | P0 | One primary role is required; selection advances to onboarding and is retained when navigating back. Additional skills do not replace the primary role. | Select Marketing, add photography, go back/forward; primary remains Marketing. |
| W03 | P0 | Short onboarding captures display name, primary category, additional skills, interests, weekly hours, duration, existing-product/idea answer, and optional introduction. Profile is reviewable and editable. | Save a complete profile, change weekly hours from 5 to 7, revisit it, and confirm 7. |
| W04 | P1 | Matching priorities reflect the chosen role: a creator is shown complementary Marketing/Sales capacity; Marketing/Sales users are steered to projects needing that role. | Repeat onboarding for each role and inspect the recommendation rationale. |
| W05 | P0 | Team matching shows candidate role, skills, availability, fill-role rationale, invitation/acceptance status, and missing roles. Sample people are unmistakably labeled demonstration profiles. | Open every candidate card and verify every field and the demo label. |
| W06 | P0 | View profile, invite, accept, decline, search another, and confirm team are operable state transitions. Sending an invitation never implies real delivery or acceptance. | Invite candidate A; verify `Invited`. Decline A; verify `Declined`. Invite/accept B only through the explicit demo action. |
| W07 | P0 | Team confirmation reflects current accepted membership and still exposes missing roles; no one is added merely by viewing or inviting. | Invite but do not accept a Sales candidate; confirm that Sales remains missing. |
| W08 | P0 | Project create/edit covers name, description, category, target customers, RM budget, duration, start/end dates, channels, objective, members, assumptions, and success criteria. | Create the fixture project below, edit the budget, and verify all dependent views update. |
| W09 | P0 | Project Overview shows goal, budget, deadline, members, phase, latest recommendation, and next reporting deadline from the saved project. | Compare every overview value with the fixture; no unrelated sample value may remain. |
| W10 | P0 | Initial plans contain actionable, role-specific tasks. Each task exposes all 15 required fields: title, assignee, role, objective, rationale, steps, deliverable, priority, start date where applicable, due date, estimate, completion criteria, evidence, dependencies, and status. | Inspect one task per role; reject vague titles such as “Do marketing.” |
| W11 | P0 | A user can open task detail, change among Pending/In Progress/Completed/Blocked/Needs Review, comment, submit a deliverable/evidence, report a blocker, and request a deadline change. | Exercise each action on one task, navigate away/back, and verify retention. |
| W12 | P0 | Task updates propagate to project progress without treating an AI proposal as completed work. Cross-role dependencies remain visible. | Complete exactly 1 of 4 tasks; overview shows 25%, not a rounded or sample value. |
| W13 | P0 | Reporting supports a visible interval and editable draft values for inquiries, orders, units, recorded revenue, cancellations/refunds, channel, planned/actual and categorized costs, customer feedback, task progress, blockers, workload, and support needed. | Enter the report fixture, edit one draft field, then submit. |
| W14 | P0 | Report submission creates a dated history entry. Previous reports are not silently overwritten and “actual” fields contain only user-entered facts. | Submit period 1 and period 2; history contains both original records. |
| W15 | P0 | Analysis is generated only from submitted values and includes summary, prior-period change, inquiry/order patterns, marketing observations, costs/budget, product feedback, delayed work, possible explanations, cited evidence, uncertainty, next actions, role tasks, and capacity assessment. | Analyze fixture period 1, then period 2; every numeric statement must trace to those reports. |
| W16 | P0 | Low evidence produces cautious language (“insufficient evidence” or equivalent), not a fabricated causal conclusion. | Submit 8 inquiries, 1 order, and only two price questions; analysis may propose a test but must not assert “overpriced.” |
| W17 | P0 | Revised tasks explain what changed, why, owner, expected outcome, success measure, and next evidence. Proposed tasks require review/acceptance before joining active work. | Generate proposals, reject one and accept one; only the accepted task appears as active. |
| W18 | P0 | Each reporting cycle versions its report, analysis, recommendations, and task plan. Completed tasks and old plans remain available. | Finish two cycles and verify both plan versions and the completed task still exist. |
| W19 | P0 | Major changes to responsibilities, goals, spending, or external actions require explicit confirmation. | Trigger a reassignment/spend proposal, cancel confirmation, and verify state is unchanged. |
| W20 | P0 | Capacity/recruitment recommendations name an evidence-based gap, required category/skills, expected benefit, and alternatives. Weak sales alone does not trigger recruitment. | Use the capacity fixture; then use a low-sales/no-overload report and compare outcomes. |
| W21 | P0 | Recruitment ranks only available demo profiles, shows reasons and statuses, and requires acceptance before membership. Existing members are never auto-removed. | Invite a candidate; verify `Invited` and unchanged team. Accept explicitly; verify membership and role onboarding/task proposal. |
| W22 | P1 | If no candidate fits, the UI says so and suggests redistribution or scope reduction. | Select a deliberately unavailable skill/capacity combination and verify a useful empty state. |
| W23 | P0 | All nine connected areas are reachable: Role Selection, Onboarding, AI Team Matching, Project Overview, My Tasks, Sales Reporting, AI Analysis, Team Management, and Project History. | Traverse every navigation control at desktop and phone widths; browser Back must not destroy data. |
| W24 | P0 | The loop can repeat: role → team → project/tasks → task evidence → report → analysis → accepted next tasks → capacity/recruitment → next report. | Complete the golden-path test below twice without a manual storage edit. |

## Data integrity, persistence, and transparency

| ID | Pri | Acceptance condition | Deterministic check |
|---|---:|---|---|
| D01 | P0 | Profiles, projects, memberships, invitations, tasks/submissions, reports, expenses/feedback, analyses, recruitment, and history use stable IDs/relationships rather than display-text matching. | Create similarly named records and verify updates affect only the selected ID. |
| D02 | P0 | Revenue, recorded costs, and profit labels are distinct. Planned expense is never counted as actual cost. “Actual profit” appears only with sufficient confirmed revenue/cost data; otherwise use “estimated” or “not available.” | Use the financial fixture; inspect overview, analysis, and history totals. |
| D03 | P0 | Inquiries ≠ orders; units ≠ orders; unpaid/unconfirmed orders are excluded from confirmed revenue or visibly separated by payment status. | Enter 12 inquiries, 3 orders, 4 units, only RM40 confirmed revenue; all four values remain distinct. |
| D04 | P0 | AI plans/proposals do not increment completed work, sales, customers, orders, or deliverables. No fabricated activity is mixed with entered data. | Generate a plan on a zero-data project; factual totals stay zero. |
| D05 | P0 | Submitted reports and historical plans are append-only from normal UI flows; corrections create a visible revision/audit entry rather than silent mutation. | Record the original period, correct it if supported, and confirm both original/revision provenance. |
| D06 | P0 | Edits propagate consistently across relevant pages and derived totals recompute from records, not duplicated constants. | Change actual packaging cost RM15 → RM18; every total changes by exactly RM3. |
| D07 | P0 | Local persistence survives reload and browser restart where localStorage is supported. A documented reset path clears only the demo app’s namespaced data. | Save mid-flow, reload, close/reopen, then reset; verify both retention and clean first-run state. |
| D08 | P1 | Corrupt, missing, or older stored data fails safely to a recoverable empty/default state without deleting unrelated localStorage keys. | Preserve a sentinel key, corrupt the OnlySkills value, reload, recover/reset, and confirm the sentinel remains. |
| D09 | P0 | The UI prominently states: local demo, sample profiles/data, rule-based or simulated AI, no real multi-user collaboration, and no real invitations/messages/external publishing. | Verify the disclosure is visible before or within each affected workflow, not hidden only in source/comments. |
| D10 | P0 | AI output is never described as a real model/API result unless such a service is actually connected. External action buttons clearly describe their demo/manual behavior. | Search visible copy for claims such as “AI contacted…” or “published”; none may be unverified. |
| D11 | P1 | No client-side secrets/API keys exist. AI/matching logic is separated enough to replace with a service later, and storage/calculation failures yield an honest error state. | Inspect source and simulate unavailable/corrupt storage; confirm no credential and a recoverable message. |

## Validation, states, responsive behavior, and accessibility

| ID | Pri | Acceptance condition | Deterministic check |
|---|---:|---|---|
| Q01 | P0 | Required fields block progression with inline, field-associated messages; whitespace-only names/descriptions fail. Optional introduction remains optional. | Submit each form empty, then with spaces; focus moves to the first invalid field. |
| Q02 | P0 | Hours, duration, money, counts, units, revenue, and costs reject negative/non-finite values; integer-only counts reject decimals; zero is allowed where meaningful. | Try `-1`, `1.5` for orders, `e`, and a very large value; no invalid record is saved. |
| Q03 | P0 | End/due dates cannot precede their start dates; reporting dates/intervals are coherent; deadline-change requests require a valid new date/reason. | Set end one day before start and due before task start; both are blocked inline. |
| Q04 | P1 | Duplicate submit clicks do not duplicate invitations, reports, analyses, proposals, or team memberships. | Rapidly double-click each primary submit once; history gains exactly one record. |
| Q05 | P1 | Loading, empty, success, validation, and recoverable error states are perceivable and preserve user input where appropriate. | Exercise first-run empties, a successful save, a validation error, and simulated storage failure. |
| Q06 | P0 | At 320 px through wide desktop, content has no page-level horizontal overflow, cards/forms remain readable, and navigation remains usable. | Test 320×568, 390×844, 768×1024, and 1440×900 at 100% and 200% zoom. |
| Q07 | P0 | All actions are keyboard reachable in a logical order; focus is visible; Enter/Space activate custom controls; no keyboard trap exists. | Complete role → onboarding → invitation → task update → report using keyboard only. |
| Q08 | P0 | Forms have programmatic labels/instructions; errors are announced/associated; headings and landmarks are logical; buttons/links use meaningful accessible names. | Inspect accessibility tree and run a screen-reader form pass. |
| Q09 | P1 | Status/priority/error meaning is not conveyed by color alone; text contrast is readable; touch targets are comfortably usable. | View in grayscale/high contrast and tap all controls at phone width. |
| Q10 | P1 | Dialogs, if used, receive focus, constrain it appropriately, close with Escape/cancel, and return focus to the trigger. Reduced-motion preference removes nonessential animation. | Test candidate/task/confirmation dialogs and `prefers-reduced-motion`. |

## Deterministic manual fixtures

| Test | Exact setup and expected result |
|---|---|
| M01 Golden path | Fresh storage → Product Creator → name `Amina`, skills `Food prep`, 6 h/week, 30 days, existing product → invite and explicitly accept one Marketing and one Sales demo profile → project `Campus Chili`, RM200, 2026-10-12 to 2026-11-10. Create plan, complete one task with evidence, submit report, analyze, accept one new task, inspect recruitment, then start the next period. Every step persists and appears in history. |
| M02 Financial arithmetic | Planned spend RM120; actual product RM40 + packaging RM15 + marketing RM10 + other RM5 = **RM70 actual**. Recorded/confirmed revenue RM150. Budget remaining is **RM130** against the RM200 starting budget; net on recorded figures is **RM80**, labeled actual only if all required confirmed cost/payment data exists. Planned RM120 must not make actual cost RM190. |
| M03 Funnel separation | Inquiries 12, actual orders 3, units 4, recorded revenue RM40, cancelled/refunded 1. UI and analysis preserve those distinct values; conversion may be shown as **25% orders/inquiries** only if labeled with its formula. |
| M04 Period comparison | Period 1: 8 inquiries, 1 order, RM20 revenue, RM30 actual costs. Period 2: 12 inquiries, 3 orders, RM60 revenue, RM10 actual costs. Analysis reports exact changes: +4 inquiries, +2 orders, +RM40 revenue; it does not claim causality. |
| M05 Uncertainty | Add only `Two people asked about price` to M03. Analysis may suggest value/price investigation and next evidence, but must not conclude the product is overpriced. |
| M06 Progress | Four active tasks; mark one Completed, one Needs Review, one Blocked, one Pending. Completed progress is exactly **1/4 (25%)** and Blocked is not counted as complete. |
| M07 Invitation consent | Send an invitation: team count unchanged. Mark declined: still unchanged. Invite another and explicitly accept: team count increases by one and exactly one membership/history event is created. |
| M08 Capacity trigger | Marketing has three overdue tasks and reports 10 required hours with 2 available; other roles are on time. Recommendation names Marketing capacity, evidence, desired skills, and alternatives. The same low sales with no workload/skill gap produces no automatic recruitment. |
| M09 Persistence | After M01, reload on each of the nine pages and restart the browser. Selected role, draft/completed tasks, submitted reports, analysis versions, invitations, and project edits remain. |
| M10 History integrity | Capture report/plan 1, submit period 2, and accept only one proposal. History retains both reports, both analyses/plans, the original completed task, and the rejected proposal’s decision without rewriting period 1. |
| M11 Empty/error recovery | Start without a project/report/candidate and verify useful empty actions. Then corrupt only the app’s stored JSON; the app offers recovery/reset and keeps an unrelated `onlyskill-qa-sentinel` localStorage key. |
| M12 Responsive/a11y | Run the entire M01 flow at 320×568 with keyboard only and at 1440×900 with 200% zoom. No action is hidden, clipped, hover-only, or identifiable solely by color. |

## Release evidence

- Run `node tests/smoke.mjs` from the project directory and retain its output.
- Complete M01–M12, recording pass/fail and a short artifact reference for every failure.
- Report separately what is functional, what is deterministic simulation, and what needs a real backend, shared database, AI API, authentication, or messaging/publishing integration.
- Do not report deployment, real collaboration, real invitations, or successful external actions unless independently verified.
