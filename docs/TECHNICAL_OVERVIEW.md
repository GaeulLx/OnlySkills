# OnlySkills technical overview

OnlySkills connects WorkBuddy to an authenticated remote MCP server hosted with the Node.js/Express backend. WorkBuddy receives the user's goal, plans the multi-step workflow, generates the five agent deliverables, and uses its native document tools to create a cost spreadsheet and marketing plan. It then calls MCP tools to retrieve synthetic context, obtain authoritative business calculations, validate the final results, and persist a run. Firebase/Firestore stores runs when configured; memory mode is available for local demos.

The five roles are Business Analyst, Growth, Team Builder, Operations, and Feedback. Backend validation checks budget allocation, saleable stock, break-even figures, mock campaign KPIs, required output structure, and the approval gate. Artifact names and locations are recorded from WorkBuddy; the backend does not independently inspect WorkBuddy's files. Recommendation approval is recorded only and does not trigger purchases, messages, or other outside actions.

## Demo assumptions and limitations

The sample business case is illustrative: 20 bottles purchased, one retained for demonstration, 19 maximum saleable, and modeled allocation of MYR 499.50 against a MYR 500 cap. Operating break-even is 24 sales and the full-reserve cash recovery hurdle is 26 sales, both above the saleable quantity. These figures are planning assumptions, not verified supplier quotes, purchase approval, or a demand forecast.

The 20 sales rows and three student creator profiles are synthetic. The MCP server labels them as mock data and does not claim that they represent actual orders or people. Firestore is active only when the health endpoint reports `persistence: "firebase"`; memory storage resets when the backend process restarts.

## Honest demo claims

- WorkBuddy is the primary planner and content-generating agent in the MCP-connected demonstration.
- WorkBuddy creates the two deliverables with its own native document tools; the backend records references and validates the structured results.
- The backend supplies deterministic business calculations and validates outputs against synthetic data.
- CodeBuddy and OpenAI are not backend providers. WorkBuddy is the only AI execution engine in the MCP-connected judging demonstration.
- A recommendation waits for a human decision. Approval records the choice but does not execute external actions.
