# WorkBuddy MCP demo prompt

Connect the OnlySkills MCP server in WorkBuddy first. Use WorkBuddy's native document creation tools for both artifacts. The prompt below is intended to demonstrate WorkBuddy as the primary execution engine, with the OnlySkills MCP tools providing data, deterministic calculations, validation, and persistence.

```text
Run the OnlySkills workflow end to end for this goal: Plan a small reusable bottle business for university students with a maximum starting budget of MYR 500.

Act as the orchestrator. Decompose the goal into steps and do not ask me to manually guide intermediate work. Use WorkBuddy's specialist-agent or parallel-task capabilities to run independent Business Analyst, Growth, Team Builder, and Operations work in parallel when available. Retrieve the OnlySkills demo context and calculate the business case with the OnlySkills tools. Reconcile the work, then have Feedback identify an evidence-based next action. Use the server's calculated figures as the source of truth. Treat sales rows and creator profiles as synthetic demo data; label assumptions and never claim a forecast, quote, confirmed creator, or real transaction.

Create two immediately usable deliverables using WorkBuddy's native document tools: (1) `OnlySkills_Cost_Model.xlsx`, a cost and break-even spreadsheet, and (2) `OnlySkills_Growth_Plan.docx`, a marketing plan document with three social posts and a one-week content calendar. Save both under `C:\Users\ASUS\WorkBuddy AI\OnlySkills` and note their exact titles and locations.

Before finishing, cross-check the costs, budget, saleable stock, break-even figures, mock Operations metrics, and completeness of both deliverables. Call validate_and_save_workflow with all five structured results and references to both files. If a tool fails, inspect the error and retry once when safe; if it still fails, disclose the blocker. If validation reports issues, correct the results and retry. Report the run ID, validation outcome, artifact titles/locations, key findings, and approval action ID. Then stop and wait for my explicit approval or rejection. Do not spend money, contact students, or claim to execute any outside action.
```

Approval prompt after reviewing the actual output:

```text
I have reviewed the OnlySkills recommendation. [Approve/Reject] it. Record my decision with the OnlySkills MCP tool using the run ID and action ID from this result. Do not take any other external action.
```
