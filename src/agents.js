const { creators, sales } = require('./data/mockData');

// Reconciled, illustrative base case from the OnlySkills cost workbook.
// These are planning assumptions, not supplier quotes or a demand forecast.
const pilot = Object.freeze({
  purchasedUnits: 20,
  retainedDemoUnits: 1,
  productCostPerUnit: 12,
  packingPerPurchasedUnit: 1,
  pricePerUnit: 20,
  variableDeliveryPerSale: 0,
  paymentPercent: 0.02,
  paymentFlatFee: 0.10,
  marketingCap: 80,
  printingCap: 20,
  pickupSetupCap: 40,
  contingencyReserve: 90,
  currency: 'MYR'
});

function roundMoney(amount) {
  return Number(amount.toFixed(2));
}

function businessAnalyst(input) {
  const requestedBudget = input.budget === undefined ? 500 : Number(input.budget);
  const budget = Number.isFinite(requestedBudget) && requestedBudget >= 0 ? requestedBudget : 500;
  const currency = typeof input.currency === 'string' && input.currency.trim()
    ? input.currency.trim().toUpperCase()
    : pilot.currency;
  const saleableUnits = pilot.purchasedUnits - pilot.retainedDemoUnits;
  const paymentFeePerSale = roundMoney(pilot.pricePerUnit * pilot.paymentPercent + pilot.paymentFlatFee);
  const variableCostPerSoldUnit = roundMoney(
    pilot.productCostPerUnit + pilot.packingPerPurchasedUnit + pilot.variableDeliveryPerSale + paymentFeePerSale
  );
  const contributionPerSoldUnit = roundMoney(pilot.pricePerUnit - variableCostPerSoldUnit);
  const fixedOperatingIncludingDemo = roundMoney(
    pilot.marketingCap + pilot.printingCap + pilot.pickupSetupCap +
    pilot.retainedDemoUnits * (pilot.productCostPerUnit + pilot.packingPerPurchasedUnit)
  );
  const stockAndFixedCashBeforeSales = roundMoney(
    pilot.purchasedUnits * (pilot.productCostPerUnit + pilot.packingPerPurchasedUnit) +
    pilot.marketingCap + pilot.printingCap + pilot.pickupSetupCap + pilot.contingencyReserve
  );
  const paymentFeeReserve = roundMoney(saleableUnits * paymentFeePerSale);
  const budgetAllocation = roundMoney(stockAndFixedCashBeforeSales + paymentFeeReserve);
  const budgetComparisonSupported = currency === pilot.currency;
  const budgetHeadroom = budgetComparisonSupported ? roundMoney(budget - budgetAllocation) : null;
  const maxAffordablePurchasedUnits = budgetComparisonSupported
    ? Math.max(0, Math.floor(
      (budget - pilot.marketingCap - pilot.printingCap - pilot.pickupSetupCap -
        pilot.contingencyReserve + paymentFeePerSale * pilot.retainedDemoUnits) /
      (pilot.productCostPerUnit + pilot.packingPerPurchasedUnit + paymentFeePerSale)
    ))
    : null;
  const operatingBreakEvenUnits = Math.ceil(fixedOperatingIncludingDemo / contributionPerSoldUnit);
  const reserveInclusiveContributionHurdleUnits = Math.ceil(
    (fixedOperatingIncludingDemo + pilot.contingencyReserve) / contributionPerSoldUnit
  );
  const fullReserveCashHurdleUnits = Math.ceil(stockAndFixedCashBeforeSales / (pilot.pricePerUnit - paymentFeePerSale));
  const sellOutRevenue = roundMoney(saleableUnits * pilot.pricePerUnit);
  const sellOutOperatingResult = roundMoney(saleableUnits * contributionPerSoldUnit - fixedOperatingIncludingDemo);

  return {
    assumptions: [
      'Illustrative reconciled base case: 20 bottles purchased, 1 retained for demonstration, and 19 maximum saleable; 19 sales is a sell-out sensitivity, not a demand forecast.',
      'MYR 12 product cost, MYR 1 packing, MYR 20 draft price, MYR 80 marketing, MYR 20 printing, MYR 40 pickup setup, and MYR 90 contingency are planning assumptions, not verified quotes or approval to purchase.',
      'Payment fees use an illustrative 2% plus MYR 0.10 per one-bottle transaction. Confirm supplier, fees, permissions, pickup plan, and demand before real use.'
    ],
    costStructure: [
      { item: 'Product stock (20 purchased bottles)', amount: roundMoney(pilot.purchasedUnits * pilot.productCostPerUnit) },
      { item: 'Packing (20 purchased bottles)', amount: roundMoney(pilot.purchasedUnits * pilot.packingPerPurchasedUnit) },
      { item: 'Payment fee reserve (19 possible sales)', amount: paymentFeeReserve },
      { item: 'Marketing cap', amount: pilot.marketingCap },
      { item: 'Printing / QR signs cap', amount: pilot.printingCap },
      { item: 'Pickup setup cap', amount: pilot.pickupSetupCap },
      { item: 'Contingency held (not an expense unless used)', amount: pilot.contingencyReserve }
    ],
    suggestedPrice: pilot.pricePerUnit,
    estimatedUnitsAtBudget: maxAffordablePurchasedUnits,
    estimatedUnitsAtBudgetMeaning: 'Maximum whole purchased units affordable under these fixed caps and reserve; this is not a sales forecast.',
    breakEvenUnits: operatingBreakEvenUnits,
    currency: pilot.currency,
    requestedBudget: budget,
    budgetCurrency: currency,
    budgetComparisonSupported,
    budgetAllocation,
    budgetHeadroom,
    withinBudget: budgetComparisonSupported ? budgetAllocation <= budget : null,
    purchasedUnits: pilot.purchasedUnits,
    retainedDemoUnits: pilot.retainedDemoUnits,
    maximumSaleableUnits: saleableUnits,
    unitEconomics: {
      productCost: pilot.productCostPerUnit,
      packing: pilot.packingPerPurchasedUnit,
      variableDelivery: pilot.variableDeliveryPerSale,
      paymentFeePerOneBottleSale: paymentFeePerSale,
      variableCostPerSoldUnit,
      contributionPerSoldUnit
    },
    breakEvenAnalysis: {
      operatingContributionUnits: operatingBreakEvenUnits,
      reserveInclusiveContributionHurdleUnits,
      fullReserveCashHurdleUnits,
      maximumSaleableUnits: saleableUnits,
      bothContributionHurdlesExceedSaleableStock:
        operatingBreakEvenUnits > saleableUnits && reserveInclusiveContributionHurdleUnits > saleableUnits,
      fullReserveCashHurdleExceedsSaleableStock: fullReserveCashHurdleUnits > saleableUnits
    },
    sellOutSensitivity: {
      unitsSold: saleableUnits,
      revenue: sellOutRevenue,
      operatingResultBeforeReserve: sellOutOperatingResult,
      resultIfFullReserveIsAlsoSpent: roundMoney(sellOutOperatingResult - pilot.contingencyReserve),
      note: 'Sell-out sensitivity only, not expected demand; unsold saleable stock remains inventory.'
    },
    notes: currency === pilot.currency
      ? ['Base allocation is MYR 499.50 against the MYR 500 cap, leaving MYR 0.50 headroom.', 'Operating break-even is 24 sales; the full-reserve cash recovery hurdle is 26 sales. Both exceed the 19-unit saleable ceiling.']
      : ['This cost model is fixed in MYR; convert the budget to MYR before comparing it with the model. No currency conversion is performed.']
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
  return { sampleSize: sales.length, views, clicks, orders, conversionRate: Number(((orders / clicks) * 100).toFixed(1)), clickThroughRate: Number(((clicks / views) * 100).toFixed(1)), revenue, currency: 'MYR', note: 'Mock paid-order revenue is summed from the sample sales rows and is separate from the draft MYR 20 cost-model price. Conversion rate is paid orders divided by clicks.' };
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

module.exports = { runAgents, businessAnalyst, operations };
