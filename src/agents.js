const { creators, sales } = require('./data/mockData');

function businessAnalyst(input) {
  const budget = Number(input.budget) || 500;
  const unitCost = 8;
  const suggestedPrice = 20;
  return {
    assumptions: ['Illustrative mock estimates; replace with validated supplier and customer data.'],
    costStructure: [{ item: 'Product cost per unit', amount: unitCost }, { item: 'Marketing and setup', amount: Math.round(budget * 0.2) }],
    suggestedPrice,
    estimatedUnitsAtBudget: Math.max(1, Math.floor(budget / unitCost)),
    breakEvenUnits: Math.ceil((budget * 0.2) / (suggestedPrice - unitCost)),
    currency: input.currency || 'MYR'
  };
}

function growth(input) {
  const product = input.productDescription || input.goal;
  const audience = input.targetCustomer || 'university students';
  return {
    posts: [
      { platform: 'Instagram', copy: `Meet ${product}: made for ${audience}. Try it this week and tell us what you think.`, callToAction: 'DM us to order' },
      { platform: 'TikTok', copy: `Campus test: can ${product} make your day easier? Here is our 15-second demo.`, callToAction: 'Comment your question' },
      { platform: 'WhatsApp', copy: `We are taking a small first batch of ${product} orders for ${audience}.`, callToAction: 'Reply ORDER' }
    ],
    contentCalendar: [{ day: 'Monday', format: 'Product demo' }, { day: 'Wednesday', format: 'Student testimonial' }, { day: 'Friday', format: 'Offer and FAQ' }]
  };
}

function teamBuilder(input) {
  const needs = ['marketing', 'sales', 'content'];
  const matches = needs.map((skill) => {
    const person = creators.find((candidate) => candidate.skills.some((s) => s.includes(skill) || skill.includes(s))) || creators[0];
    return { studentId: person.id, name: person.name, matchedSkill: skill, reason: `Relevant skills: ${person.skills.join(', ')}`, availabilityHoursPerWeek: person.availabilityHours, suggestedTerms: person.preferredPay };
  });
  return { identifiedNeeds: needs, matches, note: 'Mock student profiles for demo use; confirm availability and consent before real collaboration.' };
}

function operations() {
  const views = sales.reduce((sum, order) => sum + order.views, 0);
  const clicks = sales.reduce((sum, order) => sum + order.clicks, 0);
  const orders = sales.filter((order) => order.status === 'paid').length;
  const revenue = sales.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.amount, 0);
  return { sampleSize: sales.length, views, clicks, orders, conversionRate: Number(((orders / clicks) * 100).toFixed(1)), clickThroughRate: Number(((clicks / views) * 100).toFixed(1)), revenue, currency: 'MYR', note: 'Conversion rate is paid orders divided by clicks.' };
}

function feedback(kpis) {
  const recommendation = kpis.conversionRate < 30
    ? 'Test a clearer call to action and a simple checkout link with the next audience cohort.'
    : 'Repeat the strongest channel and interview recent buyers to learn what drove purchase.';
  return { finding: `Mock conversion rate is ${kpis.conversionRate}% from clicks to paid orders.`, recommendation, requiresApproval: true, actionId: 'improve-conversion-001' };
}

function runAgents(input) {
  const analysis = businessAnalyst(input);
  const marketing = growth(input);
  const team = teamBuilder(input);
  const kpis = operations();
  return {
    agents: {
      businessAnalyst: { status: 'completed', result: analysis },
      growth: { status: 'completed', result: marketing },
      teamBuilder: { status: 'completed', result: team },
      operations: { status: 'completed', result: kpis },
      feedback: { status: 'completed', result: feedback(kpis) }
    },
    recommendation: feedback(kpis)
  };
}

module.exports = { runAgents };
