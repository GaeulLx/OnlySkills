# WorkBuddy manual prompt workflow

WorkBuddy is accessed through its website/chat interface in this project. These prompts are for manual use. The backend does not send data to WorkBuddy or create files there. Copy the relevant prompt into WorkBuddy, review the output, then create/export the document or table using the website's available features.

## 1. Cost and break-even spreadsheet

```text
Act as a startup business analyst helping a Malaysian university student team. Create a spreadsheet-ready cost model for this business goal: [PASTE GOAL]. Product: [PRODUCT]. Target customer: [CUSTOMER]. Total starting budget: [CURRENCY AND AMOUNT].

Return a clearly labelled table with columns: Cost category, Item, Unit cost (MYR), Quantity, Total (MYR), One-time or recurring, Assumption/source. Include product cost, packaging, delivery, marketing, platform/payment fees, and contingency where relevant. Give low/base/high cases. Recommend a test selling price and explain the margin assumptions. Calculate break-even units using fixed costs divided by (selling price minus variable cost per unit). Show the formula and intermediate values.

Do not invent supplier quotes or imply these figures are verified. Label estimates and assumptions. Flag missing inputs, keep calculations internally consistent, and finish with the three questions the team should verify before spending money. Format the result so I can paste it into a spreadsheet.
```

## 2. Marketing document and content calendar

```text
Act as a growth marketer for a student-run business. Product: [PRODUCT AND BENEFIT]. Goal: [GOAL]. Target customer: [CUSTOMER]. Brand tone: [TONE]. Budget: [AMOUNT/CURRENCY]. Channels we can actually use: [CHANNELS].

Create a short marketing plan with: (1) one-sentence positioning, (2) three distinct social posts with platform, copy, visual/video idea, and one clear call to action, (3) a one-week content calendar with day, channel, format, owner role, and metric, (4) a simple experiment comparing two messages, and (5) success measures for views, clicks, orders, and conversion rate. Make claims truthful and suitable for students. Do not promise results or invent customer testimonials. Label any assumptions. Format it as a polished document with headings and tables.
```

## 3. KPI analysis and next action

```text
Act as an operations analyst. Analyze this mock/collected campaign data: [PASTE KPI JSON OR TABLE]. Define each metric and show the calculation for click-through rate (clicks / views), conversion rate (orders / clicks), and revenue. Separate observed figures from assumptions. Point out data-quality issues and avoid causal claims from a small sample.

Give up to three prioritized next actions. For each, state the evidence, expected learning, effort, owner role, and a measurable success criterion. Mark each recommendation as requiring human approval. Do not claim to execute any action.
```

## 4. Team match proposal

```text
Act as a student project coordinator. Business goal: [GOAL]. Deadline: [DATE]. Required skills and approximate hours per week: [NEEDS]. Candidate profiles, shared with permission for this exercise: [PASTE PROFILES].

Match candidates only using skills, availability, stated interests, and collaboration preferences in the supplied profiles. Explain each match and identify gaps. Propose role, deliverables, check-in schedule, and a fair collaboration/payment option to discuss. Do not infer protected or sensitive traits, invent candidate details, or contact anyone. State that students must confirm interest, availability, and terms themselves.
```

## Save and report results

Name files clearly, for example `OnlySkills - Cost Model - Demo` and `OnlySkills - Growth Plan - Demo`. Use mock/illustrative labels in the file title or first page. For a demo screenshot, show the WorkBuddy-created artifact and explain that a person pasted the prompt and saved it manually; it was not created through the backend API.
