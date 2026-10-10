// Suggested, deterministic work breakdowns. These are not AI-verified facts,
// promised sales, or automatically completed work. Only member actions complete
// steps; submitted venture details provide context without inventing results.
export const TASK_PHASE_ORDER = {
  "Product Creator": ["sample", "quality", "unit-cost"],
  Marketing: ["message", "creative", "test"],
  Sales: ["pitch", "conversations", "follow-up"],
};

// Each tuple is [stableKey, title, instructions, completionOutput, suggestedMinutes].
// Keep stable keys when revising instructions so existing progress is preserved.
const PLANS = {
  "Product Creator": {
    sample: [
      ["offer", "Confirm the first test offer", "Write what one unit includes and what it does not include. Ask the team to resolve any missing product details before buying materials.", "A one-unit specification agreed with the team.", 10],
      ["materials", "List materials for three units", "List every ingredient, component, and tool needed for exactly three test units. Mark quantities and items already available; do not assume stock exists.", "A three-unit materials checklist with quantities and stock gaps.", 15],
      ["source", "Check one source for each missing item", "Check actual availability and price for the missing materials. Record the source and check date; ask the team before committing money.", "A source and confirmed price beside each missing material.", 20],
      ["method", "Write the preparation sequence", "Number the making steps, including setup, preparation, cleanup, and any safety precautions. Pick a work session within your submitted availability.", "A repeatable preparation checklist and planned work session.", 15],
      ["make", "Make and label three test units", "Make the three units using your checklist. Label them A, B, and C, and record actual quantities used and any differences from the plan.", "Three identified samples and an actual materials-use record.", 45],
      ["evidence", "Record sample evidence for the team", "Photograph each real sample and write one short note on its condition and any issue. Share only photos of work that actually exists.", "Three sample photos with condition notes shared in the group.", 10],
    ],
    quality: [
      ["criteria", "Define three quality checks", "Choose three observable checks appropriate to the product, such as size, finish, consistency, fit, or function. Write what a passing result looks like.", "Three written checks with clear pass criteria.", 10],
      ["inspect", "Inspect samples A, B, and C", "Apply the same checks to each sample. Record pass, fail, or not tested for every check rather than assuming all samples are ready.", "A three-sample quality checklist with actual observations.", 15],
      ["safety", "List safety and permission questions", "Identify relevant hazards, allergies, storage, handling, and selling-location permissions. Check authoritative guidance or ask a qualified person where needed; do not claim compliance without evidence.", "A safety and permission checklist, including unresolved questions.", 20],
      ["label", "Check the buyer-facing information", "Check the proposed label or information card against confirmed facts. Include necessary instructions or warnings and flag unknown shelf life, material, or ingredient details.", "A reviewed information-card draft with unsupported claims removed.", 15],
      ["package", "Test one packaging approach", "Pack one sample and test the likely carrying or delivery conditions safely. Record damage, leaks, fit, or missing protection without presenting a single test as certification.", "A packaging-test note and a photo of the tested package.", 15],
      ["fix", "Resolve or flag the defects", "List defects, their fixes, and the next recheck. Share any selling blocker with the group; keep the offer on hold if an important issue remains unresolved.", "A defect-and-fix list with ready or blocked status shared with the team.", 15],
    ],
    "unit-cost": [
      ["yield", "Confirm the real batch yield", "Count usable units from the test batch and separately record failed units and waste. Use the usable count as the costing denominator.", "Actual usable-unit count and waste note.", 5],
      ["inputs", "Add the materials actually consumed", "For each material, multiply the quantity used by its confirmed unit cost. Keep estimated prices clearly marked and retain receipts where available.", "A line-by-line materials-cost calculation.", 15],
      ["packaging", "Add packaging cost per usable unit", "List the container, label, bag, and other packaging used for one saleable unit. Add their actual costs; do not count reusable equipment as disposable packaging.", "A separate packaging-cost subtotal per unit.", 10],
      ["preparation", "Record preparation time and other costs", "Record actual preparation time and attributable costs such as delivery or fees. Agree with the team how to handle labor and shared equipment instead of silently treating them as free.", "A preparation-time record and clearly stated costing assumptions.", 15],
      ["calculate", "Calculate a provisional unit cost", "Divide batch material and attributable costs by usable units, then add per-unit packaging. Keep estimated inputs labelled and show the arithmetic for review.", "A provisional cost per unit with currency, inputs, and calculation.", 15],
      ["handoff", "Share the cost and supply limits", "Send the calculation, remaining unknowns, and the number of units you can realistically prepare to Marketing and Sales. Ask the team to confirm a selling price; cost alone is not a price decision.", "A costing and capacity handoff in the team group.", 10],
    ],
  },
  Marketing: {
    message: [
      ["facts", "Collect the confirmed product facts", "Ask the Product Creator for the real product specification, readiness, capacity, and photos. Mark unknown price, availability, or product claims as not confirmed.", "A short facts sheet separating confirmed details from unknowns.", 10],
      ["audience", "Describe one first customer group", "Choose one specific customer group relevant to the team goal. Write its likely need as a hypothesis to test, not as a researched fact.", "One customer-group description and one testable need hypothesis.", 10],
      ["benefit", "Choose one supportable benefit", "Select a single benefit supported by the actual product facts. Remove medical, environmental, performance, or quality claims that the team cannot substantiate.", "One benefit sentence with its supporting fact noted.", 10],
      ["draft", "Write a short launch-message draft", "Write a headline and two short sentences explaining what is offered and who it is for. Use confirmed information only and omit undecided prices or launch dates.", "A first launch-message draft of no more than 60 words.", 15],
      ["next-step", "Add one clear customer next step", "Choose a single next step, such as asking a question or requesting availability. Agree who will receive replies and avoid a purchase link before the team is ready.", "One call to action and a named reply owner.", 10],
      ["review", "Get a factual review from the team", "Ask the Product Creator to check facts and Sales to check whether customer questions can be answered. Record requested changes and revise the wording.", "A fact-checked message version shared in the team group.", 15],
    ],
    creative: [
      ["format", "Choose one channel and format", "Choose one channel where the intended customers can actually be reached and one format, such as a poster, photo post, or short video. Check size or format requirements.", "One channel and format specification.", 10],
      ["asset", "Get a real product image or clip", "Use an actual sample image or ask the Product Creator to make one. Get consent before showing identifiable people; do not substitute an invented product photo.", "One usable real-product asset with permission confirmed.", 15],
      ["layout", "Sketch a simple content layout", "Place the product, one supportable benefit, and one call to action in a rough layout. Keep undecided prices or dates out of the sketch.", "A rough creative layout or short-video shot list.", 10],
      ["draft", "Produce the first creative draft", "Make one draft using the agreed message and actual assets. Keep text short and ensure the customer next step is easy to spot.", "One poster, photo-post, or video draft.", 25],
      ["check", "Check readability, facts, and rights", "View the draft on a phone. Check that text is readable, contact instructions work, claims are confirmed, and all media may be used; note any required corrections.", "A phone-view checklist and corrected draft.", 10],
      ["handoff", "Export and share the ready draft", "Export in the chosen channel's format and share the file and proposed caption with the team. Ask for agreement before publishing; checking this item does not publish it automatically.", "An exported creative and caption awaiting the team's publishing decision.", 10],
    ],
    test: [
      ["recruit", "Choose five relevant people to ask", "Find five real people in the intended customer group and ask if they are willing to give brief feedback. Do not create fictional respondents or share unnecessary personal details.", "Five willing feedback participants identified privately.", 15],
      ["questions", "Write three neutral feedback questions", "Ask what they think the offer is, what is unclear, and what would make it useful. Avoid leading questions that pressure people to say they like it.", "A three-question feedback guide.", 10],
      ["show", "Show the same message to each person", "Use the same draft and questions for all five participants. Record which message version each person saw; do not count team members as target-customer feedback unless they fit the audience.", "Five feedback sessions with the tested version recorded.", 25],
      ["record", "Record what each person actually said", "For each session, note the understood offer, questions, and concerns. Separate direct observations from your interpretation and anonymize the shared notes.", "Five anonymized response notes, with no invented responses.", 15],
      ["patterns", "Identify the top two message problems", "Compare the notes and count repeated questions. Choose at most two wording problems to improve; five conversations are exploratory feedback, not proof of market demand.", "Two prioritized message issues with supporting feedback counts.", 15],
      ["revise", "Revise and hand off the message", "Update the copy or creative to address the identified problems. Share the changes and unresolved questions with Sales and the Product Creator for review.", "A revised message and a short change log shared with the team.", 15],
    ],
  },
  Sales: {
    pitch: [
      ["facts", "Confirm the offer and selling limits", "Ask the Product Creator for product details and usable stock, and ask the team for the approved price and delivery terms. Clearly mark anything not decided; do not accept an order with unknown terms.", "A confirmed-offer checklist with outstanding questions.", 10],
      ["buyer", "Choose one customer situation", "Describe one customer and the situation in which the offer might help them. Treat the assumed need as a question to validate rather than a fact.", "One customer situation and one opening needs question.", 10],
      ["opening", "Write a short conversation opener", "Write a friendly greeting, a request for permission to explain, and one neutral question about the customer's need. Keep it conversational and avoid pressure.", "A three-line opening script.", 10],
      ["offer", "Write a 30-second offer explanation", "Explain the real product, one confirmed benefit, and confirmed price or availability. If a term is unknown, state that it must be checked with the team instead of guessing.", "A 30-second pitch using confirmed facts only.", 15],
      ["practice", "Practice once and time the pitch", "Read the pitch aloud to a teammate and time it. Remove jargon and unsupported claims; keep a clear question at the end so customers can respond.", "A timed, revised pitch and one teammate's clarity note.", 10],
      ["answers", "Prepare answers to three likely questions", "Prepare short answers about price, availability, and how to order or ask for help. Record the team member to contact whenever an answer is not yet confirmed.", "A three-question answer card with escalation owners.", 15],
    ],
    conversations: [
      ["people", "Find five willing potential customers", "Choose five real people who fit the intended audience and ask permission for a short conversation. Use your actual available time; do not count invented customers.", "Five willing contacts or conversation opportunities identified privately.", 15],
      ["needs", "Ask each person about their need", "Start with your neutral needs question and listen before pitching. Record a brief anonymous note on the situation they describe.", "Five actual customer-need notes.", 20],
      ["explain", "Explain the confirmed offer", "Give your short pitch and show the actual product or approved creative where possible. Be honest about unresolved details and avoid promising unconfirmed stock or delivery.", "A record that each of the five people heard the confirmed offer.", 20],
      ["outcomes", "Record each conversation outcome", "For each person, separate not interested, interested, asked for follow-up, and explicit order. A positive comment or a question is not a sale.", "Five anonymized outcomes with interest and orders clearly separated.", 15],
      ["objections", "Summarize repeated questions or objections", "Group the questions you actually heard and count repeats. Share the top issues with Marketing and Product Creator without claiming that this small sample represents all customers.", "A counted list of real objections and questions sent to the team.", 15],
      ["permission", "Agree the next step with interested people", "Ask whether an interested person wants a reply and when. Keep contact details privately, record only necessary information, and do not follow up with someone who declines.", "A consent-based follow-up list with next action and date.", 10],
    ],
    "follow-up": [
      ["register", "Create a simple order and follow-up register", "Set up fields for a private reference, offer, quantity, status, next action, and date. Keep interest, quoted orders, confirmed orders, and paid orders as separate statuses.", "An empty or real-data-only tracking register with clear statuses.", 10],
      ["availability", "Check stock before confirming an order", "For each actual order request, ask Product Creator to confirm usable quantity and realistic fulfillment time. Mark unavailable requests as waiting rather than promising delivery.", "A stock and delivery check beside every actual request, or a recorded no-requests status.", 10],
      ["quote", "Confirm the full quote and terms", "State the agreed unit price, quantity, currency, delivery cost, and total to the customer. Ask the team to resolve missing terms before quoting; do not guess prices.", "A complete quote for each real request, or a recorded no-quotes status.", 15],
      ["confirm", "Record the customer's explicit decision", "Record an order only after the customer explicitly agrees to the offer and terms. Keep cancellations, no responses, and requests for more information separate; payment must not be assumed.", "A factual decision and order status for every real quote.", 10],
      ["fulfill", "Coordinate the agreed fulfillment step", "Share confirmed quantities and promised times with Product Creator, then update customers using the agreed reply channel. Log fulfillment only when it actually happens.", "A fulfillment or waiting-status note for each real confirmed order.", 15],
      ["close", "Reconcile paid orders and next follow-ups", "Compare actual payments and delivered orders with the register. Record confirmed income in Bookkeeping only when money was received, and list unresolved orders or consented follow-ups; zero sales is a valid result.", "A real paid-order summary and dated next-action list, including zero activity if applicable.", 15],
    ],
  },
};

export function taskStepPlan(role, phaseKey, context = {}) {
  const plan = PLANS[role]?.[phaseKey] || [];
  const goal = typeof context.teamGoal === "string" ? context.teamGoal.trim().slice(0, 300) : "";
  return plan.map(([key, title, detail, output, estimatedMinutes], index) => ({
    key,
    title,
    detail: detail + (index === 0 && goal ? ` Team goal: “${goal}”` : ""),
    output,
    estimatedMinutes,
    order: index + 1,
  }));
}
