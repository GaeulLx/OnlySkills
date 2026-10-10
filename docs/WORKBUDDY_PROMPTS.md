# WorkBuddy MCP demo prompt

Connect the OnlySkills MCP server in WorkBuddy first. Use WorkBuddy's native document creation tools for both artifacts. The prompt below is intended to demonstrate WorkBuddy as the primary execution engine, with the OnlySkills MCP tools providing data, deterministic calculations, validation, and persistence.

```text
Run the OnlySkills workflow end to end for this goal: Plan a small reusable bottle business for university students with a maximum starting budget of MYR 500.

Act as the orchestrator. Keep the run concise and do not ask me to guide intermediate steps. First call `get_onlyskills_context` and `calculate_business_case` in parallel. Then use WorkBuddy specialist agents to do Business Analyst, Growth, Team Builder, and Operations work in parallel if available. Give each agent only the relevant goal and tool output; do not repeat raw sales data. Have Feedback use the completed results to suggest one evidence-based next step. Use the server's calculated figures as the source of truth. Treat KPIs and creator profiles as synthetic demo data; label assumptions and never claim a forecast, quote, confirmed creator, or real transaction.

Create two concise, usable deliverables with WorkBuddy's native document tools: (1) `OnlySkills_Cost_Model.xlsx`, one worksheet with assumptions, budget allocation, unit economics, break-even, and sell-out sensitivity; and (2) `OnlySkills_Growth_Plan.docx`, one page with three short social posts and a three-day content calendar. Save both under `C:\Users\ASUS\WorkBuddy AI\OnlySkills` and note their exact titles and locations. Avoid decorative research or extra sections.

Before finishing, cross-check the costs, budget, saleable stock, break-even figures, mock Operations metrics, and completeness of both deliverables. Call validate_and_save_workflow with all five structured results and references to both files. If a tool fails, inspect the error and retry once when safe; if it still fails, disclose the blocker. If validation reports issues, correct the results and retry. Report the run ID, validation outcome, artifact titles/locations, key findings, and approval action ID. Then stop and wait for my explicit approval or rejection. Do not spend money, contact students, or claim to execute any outside action.
```

Approval prompt after reviewing the actual output:

```text
I have reviewed the OnlySkills recommendation. [Approve/Reject] it. Record my decision with the OnlySkills MCP tool using the run ID and action ID from this result. Do not take any other external action.
```
