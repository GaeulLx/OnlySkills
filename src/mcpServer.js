const { randomUUID, timingSafeEqual } = require('node:crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const { creators, sales } = require('./data/mockData');
const { businessAnalyst, operations } = require('./agents');
const { createRun, getRun, updateRun, appendRunEvent, claimNextRun, saveAction } = require('./store');

const sessions = new Map();
const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000;

function expireInactiveSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [sessionId, session] of sessions) {
    if (session.lastSeen < cutoff) {
      sessions.delete(sessionId);
      void session.server.close();
    }
  }
}

function toolResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function toolError(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

function checkWorkflowResults(input) {
  const problems = [];
  const expectedBusiness = businessAnalyst({ budget: input.budget, currency: input.currency });
  const expectedOperations = operations();
  const business = input.results.businessAnalyst;
  const growth = input.results.growth;
  const team = input.results.teamBuilder;
  const ops = input.results.operations;
  const feedback = input.results.feedback;

  if (Number(business.budgetAllocation) !== expectedBusiness.budgetAllocation) problems.push('Business Analyst budgetAllocation does not match the validated cost model.');
  if (business.budgetCurrency !== expectedBusiness.budgetCurrency) problems.push('Business Analyst budgetCurrency does not match the requested currency.');
  if (business.budgetComparisonSupported !== expectedBusiness.budgetComparisonSupported) problems.push('Business Analyst currency-comparison flag is incorrect.');
  if (expectedBusiness.budgetComparisonSupported && Number(business.budgetHeadroom) !== expectedBusiness.budgetHeadroom) problems.push('Business Analyst budgetHeadroom does not match the validated cost model.');
  if (expectedBusiness.budgetComparisonSupported && business.withinBudget !== expectedBusiness.withinBudget) problems.push('Business Analyst withinBudget does not match the validated cost model.');
  if (Number(business.purchasedUnits) !== expectedBusiness.purchasedUnits || Number(business.retainedDemoUnits) !== expectedBusiness.retainedDemoUnits) problems.push('Business Analyst stock assumptions do not match the validated model.');
  if (Number(business.maximumSaleableUnits) !== expectedBusiness.maximumSaleableUnits) problems.push('Business Analyst maximumSaleableUnits does not match the validated stock assumptions.');
  if (Number(business.breakEvenAnalysis?.operatingContributionUnits) !== expectedBusiness.breakEvenAnalysis.operatingContributionUnits) problems.push('Business Analyst operating break-even does not match the validated cost model.');
  if (Number(business.breakEvenAnalysis?.reserveInclusiveContributionHurdleUnits) !== expectedBusiness.breakEvenAnalysis.reserveInclusiveContributionHurdleUnits) problems.push('Business Analyst reserve-inclusive contribution hurdle does not match the validated cost model.');
  if (Number(business.breakEvenAnalysis?.fullReserveCashHurdleUnits) !== expectedBusiness.breakEvenAnalysis.fullReserveCashHurdleUnits) problems.push('Business Analyst full-reserve cash hurdle does not match the validated cost model.');
  if (Number(business.unitEconomics?.contributionPerSoldUnit) !== expectedBusiness.unitEconomics.contributionPerSoldUnit) problems.push('Business Analyst contribution per sold unit does not match the validated cost model.');

  if (!Array.isArray(growth.posts) || growth.posts.length < 3 || growth.posts.some((post) => !post.platform || !post.copy || !post.callToAction)) {
    problems.push('Growth result must contain at least three complete posts with platform, copy, and callToAction.');
  }
  if (!Array.isArray(growth.contentCalendar) || growth.contentCalendar.length < 3) problems.push('Growth result must contain at least three content-calendar entries.');
  if (!Array.isArray(team.identifiedNeeds) || team.identifiedNeeds.length < 1) problems.push('Team Builder must identify at least one skill need.');
  if (!Array.isArray(team.matches) || team.matches.length < 3) problems.push('Team Builder must include at least three mock creator matches.');

  for (const key of ['views', 'clicks', 'orders', 'revenue', 'conversionRate', 'clickThroughRate']) {
    if (Number(ops[key]) !== Number(expectedOperations[key])) problems.push(`Operations ${key} does not match the provided mock sales data.`);
  }
  if (feedback.requiresApproval !== true || typeof feedback.recommendation !== 'string' || !feedback.recommendation.trim()) {
    problems.push('Feedback must include a recommendation and requiresApproval: true.');
  }

  return { valid: problems.length === 0, problems, expectedBusiness, expectedOperations };
}

function buildMcpServer() {
  const server = new McpServer({
    name: 'onlyskills-workflow',
    version: '1.0.0'
  }, {
    instructions: [
      'You are the execution agent for OnlySkills. Decompose each user goal into a plan and run the steps autonomously.',
      'Use WorkBuddy native specialist-agent or parallel-task capabilities for independent Business Analyst, Growth, Team Builder, and Operations work when available; reconcile their results before Feedback and final validation.',
      'Call get_onlyskills_context and calculate_business_case in parallel because they are independent.',
      'When acting as the pre-started website queue worker, repeatedly call claim_next_run until it returns a goal. For each claimed goal, use its runId in update_run_progress and validate_and_save_workflow, then continue waiting only if the user asked you to remain as a worker. For a normal one-goal task, do not poll the queue.',
      'Use the summarized Operations KPIs returned from the server; the underlying sample is 20 synthetic sales rows.',
      'Use calculate_business_case for the authoritative deterministic cost and break-even calculations.',
      'Generate the Growth, Team Builder, Operations, and Feedback deliverables yourself from the goal and context; do not describe mock data as real.',
      'Create concise but usable artifacts with WorkBuddy native document tools: one cost-model spreadsheet sheet and one-page marketing plan.',
      'If a tool fails, inspect the error and retry once when safe; if it still fails, disclose the blocker and do not claim success. Call validate_and_save_workflow only after all five agent outputs and both artifact references are ready. Fix validation errors and retry.',
      'Approval is a separate user decision. Only call record_recommendation_decision after the user explicitly approves or rejects.'
    ].join(' ')
  });

  server.registerTool('get_onlyskills_context', {
    title: 'Get OnlySkills demo context',
    description: 'Read the summarized KPIs calculated from 20 mock sales rows and three mock student creator profiles. These are synthetic demo records, not live campus data.',
    inputSchema: {}
  }, async () => toolResult({
    dataType: 'synthetic_demo_data',
    operationsMetrics: {
      ...operations(),
      refundedRows: sales.filter((order) => order.status === 'refunded').length,
      dataMethod: 'KPIs calculated server-side from all 20 synthetic sales rows.'
    },
    creators,
    limitations: [
      'Sales KPIs and creator profiles are derived from mock data.',
      'Ask the user for goal-specific details if the submitted goal does not provide them.',
      'Do not claim that a creator has agreed to participate or that sales are forecast.'
    ]
  }));

  server.registerTool('calculate_business_case', {
    title: 'Calculate validated business case',
    description: 'Calculate budget allocation, unit economics, break-even, and sell-out sensitivity using the reconciled OnlySkills base-case assumptions. This is the authoritative source for those figures.',
    inputSchema: {
      budget: z.number().nonnegative().default(500).describe('User-provided budget amount.'),
      currency: z.string().default('MYR').describe('Currency code for the supplied budget.')
    }
  }, async ({ budget, currency }) => toolResult({
    dataType: 'illustrative_planning_model',
    result: businessAnalyst({ budget, currency }),
    caveat: 'Planning assumptions only; this is not a quote, demand forecast, or purchase approval.'
  }));

  server.registerTool('claim_next_run', {
    title: 'Claim a queued OnlySkills goal',
    description: 'Claim the oldest goal submitted from the OnlySkills website. Waits up to waitSeconds for a goal, then returns available:false if the queue is empty. A claimed run must be completed with validate_and_save_workflow or marked failed with fail_run.',
    inputSchema: {
      waitSeconds: z.number().int().min(0).max(20).default(10).describe('How long to wait for a website goal, from 0 to 20 seconds.')
    }
  }, async ({ waitSeconds }) => {
    const run = await claimNextRun(waitSeconds);
    if (!run) return toolResult({ available: false, message: 'No website goal arrived during the wait. You may call claim_next_run again if you are acting as the waiting worker.' });
    return toolResult({
      available: true,
      runId: run.runId,
      goal: run.goal,
      budget: run.input?.budget ?? 500,
      currency: run.input?.currency || 'MYR',
      status: run.status,
      message: 'This run is now claimed by the WorkBuddy worker. Use this runId for progress, validation, and failure reporting.'
    });
  });

  server.registerTool('update_run_progress', {
    title: 'Report WorkBuddy workflow progress',
    description: 'Append an actual WorkBuddy progress update to a website-submitted OnlySkills run. The run must already be claimed and running.',
    inputSchema: {
      runId: z.string().uuid(),
      step: z.string().min(1).max(100),
      detail: z.string().min(1).max(1000)
    }
  }, async ({ runId, step, detail }) => {
    const run = await getRun(runId);
    if (!run) return toolError('Run not found.');
    if (run.status !== 'running' || run.provider !== 'workbuddy_mcp') return toolError('Progress can only be reported for a running website-queued WorkBuddy run.');
    await updateRun(runId, { claimExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    const updated = await appendRunEvent(runId, { step: step.trim(), detail: detail.trim(), source: 'workbuddy' });
    if (!updated) return toolError('Run not found.');
    return toolResult({ runId, status: updated.status, event: updated.events.at(-1) });
  });

  server.registerTool('fail_run', {
    title: 'Mark a WorkBuddy run as failed',
    description: 'Mark a claimed website-submitted run as failed and provide a brief explanation if WorkBuddy cannot complete it.',
    inputSchema: {
      runId: z.string().uuid(),
      error: z.string().min(1).max(500)
    }
  }, async ({ runId, error }) => {
    const run = await getRun(runId);
    if (!run) return toolError('Run not found.');
    if (run.status !== 'running' || run.provider !== 'workbuddy_mcp') return toolError('Only a running website-queued WorkBuddy run can be marked failed.');
    await updateRun(runId, { status: 'failed', error: error.trim() });
    const updated = await appendRunEvent(runId, { step: 'WorkBuddy could not complete the goal', detail: error.trim(), source: 'workbuddy' });
    return toolResult({ runId, status: 'failed', error: error.trim(), updatedAt: updated?.updatedAt });
  });

  server.registerTool('validate_and_save_workflow', {
    title: 'Validate and save goal workflow',
    description: 'Validate all five WorkBuddy-generated agent results against the business model and synthetic Operations data, then persist the results in OnlySkills. Provide references for the cost spreadsheet and marketing document created in WorkBuddy.',
    inputSchema: {
      runId: z.string().uuid().optional().describe('Include this when saving results for a goal claimed from the OnlySkills website.'),
      goal: z.string().min(1).max(2000),
      budget: z.number().nonnegative().default(500),
      currency: z.string().default('MYR'),
      results: z.object({
        businessAnalyst: z.record(z.string(), z.unknown()),
        growth: z.record(z.string(), z.unknown()),
        teamBuilder: z.record(z.string(), z.unknown()),
        operations: z.record(z.string(), z.unknown()),
        feedback: z.record(z.string(), z.unknown())
      }),
      artifacts: z.array(z.object({
        kind: z.enum(['cost_spreadsheet', 'marketing_document']),
        title: z.string().min(1).max(200),
        location: z.string().min(1).max(1000)
      })).min(2).max(10)
    }
  }, async ({ runId, goal, budget, currency, results, artifacts }) => {
    const queuedRun = runId ? await getRun(runId) : null;
    if (runId && !queuedRun) return toolError('The specified website run was not found.');
    if (queuedRun && (queuedRun.status !== 'running' || queuedRun.provider !== 'workbuddy_mcp')) {
      return toolError('Results can only be saved to a running website-queued WorkBuddy run.');
    }

    const validation = checkWorkflowResults({ budget, currency, results });
    const requiredKinds = new Set(artifacts.map((artifact) => artifact.kind));
    if (!requiredKinds.has('cost_spreadsheet') || !requiredKinds.has('marketing_document')) {
      validation.valid = false;
      validation.problems.push('Provide references for both the cost_spreadsheet and marketing_document created in WorkBuddy.');
    }
    if (!validation.valid) return toolError(JSON.stringify({ valid: false, problems: validation.problems }));

    const savedRunId = runId || randomUUID();
    const actionId = `onlyskills-recommendation-${savedRunId}`;
    const recommendation = { ...results.feedback, actionId };
    const savedResults = { ...results, feedback: recommendation };
    const run = {
      runId: savedRunId,
      goal: queuedRun?.goal || goal.trim(),
      status: 'awaiting_approval',
      provider: 'workbuddy_mcp',
      providerNote: runId
        ? 'The user submitted this goal on the OnlySkills website. WorkBuddy Desktop claimed it through MCP, generated the agent outputs, and the backend validated the business figures and mock Operations metrics.'
        : 'WorkBuddy generated and orchestrated the agent outputs through MCP; the backend validated the business figures and mock Operations metrics.',
      input: queuedRun?.input || { goal: goal.trim(), budget, currency },
      agents: Object.fromEntries(Object.entries(savedResults).map(([name, result]) => [name, { status: 'completed', result }])),
      results: savedResults,
      recommendation,
      artifacts,
      events: [...(queuedRun?.events || []), {
        step: 'Results validated and saved',
        detail: 'WorkBuddy submitted all five agent results and both artifact references; OnlySkills validation passed.',
        source: 'workbuddy',
        at: new Date().toISOString()
      }].slice(-100),
      validation: {
        valid: true,
        checked: ['budget allocation', 'saleable stock', 'break-even figures', 'mock sales KPIs', 'growth output structure', 'team output structure', 'approval gate'],
        artifacts: 'References supplied by WorkBuddy; file contents and existence are not independently inspected by the backend.'
      }
    };
    if (queuedRun) await updateRun(savedRunId, run);
    else await createRun(run);
    await saveAction({ runId: savedRunId, actionId, type: 'recommendation', status: 'pending', recommendation });
    return toolResult({
      runId: savedRunId,
      status: run.status,
      actionId,
      validation: run.validation,
      artifacts,
      nextStep: 'Present the results and wait for an explicit user approval or rejection before recording the decision.'
    });
  });

  server.registerTool('record_recommendation_decision', {
    title: 'Record recommendation decision',
    description: 'Record an explicit user approval or rejection for a saved OnlySkills run. This records the decision only; it does not spend money or contact anyone.',
    inputSchema: {
      runId: z.string().uuid(),
      actionId: z.string().min(1).max(200),
      approved: z.boolean()
    }
  }, async ({ runId, actionId, approved }) => {
    const run = await getRun(runId);
    if (!run) return toolError('Run not found.');
    if (run.recommendation?.actionId !== actionId) return toolError('Action ID does not match the recommendation for this run.');
    if (run.status !== 'awaiting_approval') return toolError(`This run is already ${run.status}; its decision cannot be changed.`);
    const status = approved ? 'approved' : 'rejected';
    const decidedAt = new Date().toISOString();
    await saveAction({ runId, actionId, type: 'recommendation', status, approvedAt: decidedAt });
    await updateRun(runId, { status, approval: { actionId, approved, decidedAt } });
    return toolResult({ runId, actionId, status, message: approved ? 'Approval recorded. No external action was executed.' : 'Rejection recorded.' });
  });

  return server;
}

function attachMcpRoute(app) {
  app.get('/mcp/health', (_req, res) => res.json({
    ok: true,
    transport: 'streamable-http',
    authenticationConfigured: Boolean(process.env.MCP_AUTH_TOKEN?.trim()),
    activeSessions: sessions.size
  }));

  app.all('/mcp', async (req, res) => {
    const configuredToken = process.env.MCP_AUTH_TOKEN?.trim();
    const authorization = req.get('authorization') || '';
    const suppliedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!configuredToken) return res.status(503).json({ error: 'MCP endpoint is disabled until MCP_AUTH_TOKEN is configured.' });
    const expectedBytes = Buffer.from(configuredToken);
    const suppliedBytes = Buffer.from(suppliedToken);
    if (!suppliedToken || suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
      return res.status(401).json({ error: 'A valid bearer token is required.' });
    }

    expireInactiveSessions();
    const requestedSession = req.get('mcp-session-id');
    let session = requestedSession ? sessions.get(requestedSession) : null;
    if (session) session.lastSeen = Date.now();
    const isInitialize = req.method === 'POST' && req.body?.method === 'initialize';

    if (!session && !isInitialize) {
      return res.status(requestedSession ? 404 : 400).json({ error: requestedSession ? 'MCP session not found; reconnect to initialize a new session.' : 'Initialize an MCP session before making tool requests.' });
    }
    if (!session && sessions.size >= MAX_SESSIONS) return res.status(503).json({ error: 'MCP session capacity reached; reconnect later.' });

    if (!session) {
      const server = buildMcpServer();
      let transport;
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (sessionId) => sessions.set(sessionId, { server, transport, lastSeen: Date.now() }),
        onsessionclosed: (sessionId) => {
          const closed = sessions.get(sessionId);
          sessions.delete(sessionId);
          if (closed) void closed.server.close();
        }
      });
      session = { server, transport };
      try {
        await server.connect(transport);
      } catch (error) {
        console.error('MCP session initialization failed:', error.message);
        return res.status(500).json({ error: 'Unable to initialize MCP session.' });
      }
    }

    try {
      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request failed:', error.message);
      if (!res.headersSent) res.status(500).json({ error: 'MCP request failed.' });
    }
  });
}

module.exports = { attachMcpRoute };
