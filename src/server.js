require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
const { store, createRun, getRun, updateRun, saveAction } = require('./store');
const { runAgents } = require('./agents');
const { attachMcpRoute } = require('./mcpServer');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  if (req.path.startsWith('/api/')) {
    console.info(JSON.stringify({ event: 'api.request', requestId, method: req.method, endpoint: req.path }));
    res.on('finish', () => console.info(JSON.stringify({ event: 'api.response', requestId, method: req.method, endpoint: req.path, status: res.statusCode })));
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  persistence: store.mode,
  workbuddyMcpConfigured: Boolean(process.env.MCP_AUTH_TOKEN?.trim()),
  revision: process.env.RENDER_GIT_COMMIT || process.env.SOURCE_VERSION || null
}));

// Website-to-WorkBuddy queue. WorkBuddy Desktop claims queued runs over MCP.
app.post('/api/chat', async (req, res, next) => {
  try {
    const { message, budget, currency } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'message is required and must be a non-empty string' });
    if (message.trim().length > 2000) return res.status(400).json({ error: 'message must be 2000 characters or fewer' });
    if (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) return res.status(400).json({ error: 'budget must be a non-negative number' });

    const runId = randomUUID();
    const goal = message.trim();
    const input = { goal, budget: budget === undefined ? 500 : Number(budget), currency: typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'MYR' };
    await createRun({
      runId,
      goal,
      input,
      status: 'queued',
      provider: 'workbuddy_mcp',
      providerNote: 'Queued for a WorkBuddy Desktop worker connected to the OnlySkills MCP server.',
      events: [{ step: 'Goal queued', detail: 'OnlySkills saved your goal and is waiting for the WorkBuddy worker.', at: new Date().toISOString() }],
      results: null,
      recommendation: null,
      artifacts: [],
      validation: null
    });

    return res.status(202).json({
      runId,
      status: 'queued',
      message: 'Goal queued for WorkBuddy.',
      statusUrl: `/api/runs/${runId}`,
      resultsUrl: `/api/results?runId=${runId}`
    });
  } catch (error) { return next(error); }
});

app.get('/api/runs/:runId', async (req, res, next) => {
  try {
    const run = await getRun(req.params.runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    const result = run.results ? {
      ...run.results,
      recommendation: run.recommendation || run.results.feedback || null,
      artifacts: run.artifacts || [],
      validation: run.validation || null
    } : null;
    return res.json({
      runId: run.runId,
      goal: run.goal,
      status: run.status,
      events: run.events || [],
      result,
      recommendation: run.recommendation || null,
      artifacts: run.artifacts || [],
      validation: run.validation || null,
      error: run.error || null,
      updatedAt: run.updatedAt
    });
  } catch (error) { return next(error); }
});

app.post('/api/goal', async (req, res, next) => {
  try {
    const { goal, budget, currency, productDescription, targetCustomer, provider } = req.body || {};
    if (typeof goal !== 'string' || !goal.trim()) return res.status(400).json({ error: 'goal is required and must be a non-empty string' });
    if (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) return res.status(400).json({ error: 'budget must be a non-negative number' });
    if (provider && provider !== 'mock') return res.status(400).json({ error: 'The REST endpoint is a deterministic dashboard/demo path. Run the agent workflow through WorkBuddy using the authenticated /mcp connection.' });
    console.info(JSON.stringify({ event: 'goal.provider_selected', requestId: req.requestId, provider: 'mock' }));
    const runId = randomUUID();
    const input = { goal: goal.trim(), budget: budget === undefined ? 500 : Number(budget), currency, productDescription, targetCustomer };
    const actionId = `improve-conversion-${runId}`;
    const requestedProvider = 'mock';
    const providerNote = 'Deterministic REST demo flow. Use the WorkBuddy MCP connection for the WorkBuddy-led workflow.';
    const agentNames = ['businessAnalyst', 'growth', 'teamBuilder', 'operations', 'feedback'];
    const initial = {
      runId,
      goal: input.goal,
      status: 'running',
      provider: requestedProvider,
      providerNote,
      agents: Object.fromEntries(agentNames.map((name) => [name, { status: 'running' }])),
      input,
      recommendation: null
    };

    // Persist the run before starting slow model work. The caller gets its runId
    // immediately and can poll status/results instead of holding an HTTP request open.
    await createRun(initial);
    const requestId = req.requestId;
    setImmediate(() => {
      processGoalRun({ runId, actionId, input, requestedProvider, requestId })
        .catch((error) => console.error('Background goal processing failed:', error.message));
    });
    return res.status(202).json({
      runId,
      status: 'running',
      provider: requestedProvider,
      providerNote,
      statusUrl: `/api/status?runId=${runId}`,
      resultsUrl: `/api/results?runId=${runId}`
    });
  } catch (error) { return next(error); }
});

async function processGoalRun({ runId, actionId, input, requestedProvider, requestId }) {
  let output;
  const providerNote = 'Deterministic REST demo flow. Use the WorkBuddy MCP connection for the WorkBuddy-led workflow.';

  try {
    output = runAgents(input);
    const recommendation = { ...output.recommendation, actionId };
    output.agents.feedback.result = recommendation;
    await saveAction({ runId, actionId, type: 'recommendation', status: 'pending', recommendation });
    await updateRun(runId, {
      status: 'awaiting_approval',
      provider: requestedProvider,
      providerNote,
      agents: output.agents,
      results: output.agents,
      recommendation
    });
  } catch (error) {
    console.error(JSON.stringify({ event: 'goal.processing_failed', requestId, runId, message: String(error.message || error).slice(0, 500) }));
    await updateRun(runId, { status: 'failed', provider: requestedProvider, providerNote, error: 'Goal processing failed; check backend logs.' });
  }
}

app.get('/api/status', async (req, res, next) => {
  try {
    if (!req.query.runId) return res.status(400).json({ error: 'runId query parameter is required' });
    const run = await getRun(req.query.runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    return res.json({ runId: run.runId, status: run.status, provider: run.provider || 'mock', providerNote: run.providerNote || null, error: run.error || null, agents: run.agents, updatedAt: run.updatedAt });
  } catch (error) { return next(error); }
});

app.get('/api/results', async (req, res, next) => {
  try {
    if (!req.query.runId) return res.status(400).json({ error: 'runId query parameter is required' });
    const run = await getRun(req.query.runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    return res.json({ runId: run.runId, goal: run.goal, provider: run.provider || 'mock', providerNote: run.providerNote || null, results: run.results || {}, recommendation: run.recommendation || null, artifacts: run.artifacts || [], validation: run.validation || null });
  } catch (error) { return next(error); }
});

app.post('/api/approve', async (req, res, next) => {
  try {
    const { runId, actionId, approved } = req.body || {};
    if (!runId || !actionId || typeof approved !== 'boolean') return res.status(400).json({ error: 'runId, actionId, and boolean approved are required' });
    const run = await getRun(runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    if (run.recommendation?.actionId !== actionId) return res.status(404).json({ error: 'action not found for this run' });
    const status = approved ? 'approved' : 'rejected';
    await saveAction({ runId, actionId, type: 'recommendation', status, approvedAt: new Date().toISOString() });
    await updateRun(runId, { status: approved ? 'approved' : 'rejected', approval: { actionId, approved, decidedAt: new Date().toISOString() } });
    return res.json({ runId, actionId, status, message: approved ? 'Recommendation approved. No external action was executed.' : 'Recommendation rejected.' });
  } catch (error) { return next(error); }
});

attachMcpRoute(app);

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ error: 'internal server error' });
});

const port = Number(process.env.PORT) || 3000;
if (require.main === module) app.listen(port, () => console.log(`OnlySkills API listening on http://localhost:${port} (${store.mode} mode)`));
module.exports = app;
