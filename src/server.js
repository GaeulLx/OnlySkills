require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
const { store, createRun, getRun, updateRun, saveAction } = require('./store');
const { runAgents } = require('./agents');
const { generateBusinessAnalysis } = require('./codebuddyAdapter');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, persistence: store.mode }));

app.post('/api/goal', async (req, res, next) => {
  try {
    const { goal, budget, currency, productDescription, targetCustomer, provider } = req.body || {};
    if (typeof goal !== 'string' || !goal.trim()) return res.status(400).json({ error: 'goal is required and must be a non-empty string' });
    if (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) return res.status(400).json({ error: 'budget must be a non-negative number' });
    const requestedProvider = provider || process.env.AGENT_PROVIDER || 'mock';
    if (!['mock', 'codebuddy'].includes(requestedProvider)) return res.status(400).json({ error: 'provider must be mock or codebuddy' });
    const runId = randomUUID();
    const input = { goal: goal.trim(), budget: budget === undefined ? 500 : Number(budget), currency, productDescription, targetCustomer };
    const initial = { runId, goal: input.goal, status: 'running', agents: Object.fromEntries(['businessAnalyst', 'growth', 'teamBuilder', 'operations', 'feedback'].map((name) => [name, { status: 'pending' }])), input };
    await createRun(initial);
    // Deterministic mock agents run immediately. This keeps the demo under the response time target.
    const output = runAgents(input);
    let agentProvider = 'mock';
    let providerNote = 'Deterministic mock agents used.';
    if (requestedProvider === 'codebuddy') {
      try {
        const ai = await generateBusinessAnalysis(input);
        output.agents.businessAnalyst.result = ai.result;
        agentProvider = 'codebuddy';
        providerNote = 'Business Analyst generated with CodeBuddy Agent SDK; remaining agents used deterministic mock logic.';
        output.codebuddySessionId = ai.sessionId;
      } catch (error) {
        agentProvider = 'mock_fallback';
        providerNote = 'CodeBuddy was requested but unavailable or returned an invalid result; deterministic mock results were used.';
        console.error('CodeBuddy provider failed:', error.message);
      }
    }
    const recommendation = { ...output.recommendation, actionId: `improve-conversion-${runId}` };
    output.agents.feedback.result = recommendation;
    const finalRun = await updateRun(runId, { status: 'awaiting_approval', provider: agentProvider, providerNote, codebuddySessionId: output.codebuddySessionId || null, agents: output.agents, results: output.agents, recommendation });
    await saveAction({ runId, actionId: recommendation.actionId, type: 'recommendation', status: 'pending', recommendation });
    return res.status(201).json({ runId, status: finalRun.status, provider: agentProvider, providerNote, statusUrl: `/api/status?runId=${runId}`, resultsUrl: `/api/results?runId=${runId}`, recommendation });
  } catch (error) { return next(error); }
});

app.get('/api/status', async (req, res, next) => {
  try {
    if (!req.query.runId) return res.status(400).json({ error: 'runId query parameter is required' });
    const run = await getRun(req.query.runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    return res.json({ runId: run.runId, status: run.status, provider: run.provider || 'mock', providerNote: run.providerNote || null, agents: run.agents, updatedAt: run.updatedAt });
  } catch (error) { return next(error); }
});

app.get('/api/results', async (req, res, next) => {
  try {
    if (!req.query.runId) return res.status(400).json({ error: 'runId query parameter is required' });
    const run = await getRun(req.query.runId);
    if (!run) return res.status(404).json({ error: 'run not found' });
    return res.json({ runId: run.runId, goal: run.goal, provider: run.provider || 'mock', providerNote: run.providerNote || null, results: run.results || {}, recommendation: run.recommendation || null });
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

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ error: 'internal server error' });
});

const port = Number(process.env.PORT) || 3000;
if (require.main === module) app.listen(port, () => console.log(`OnlySkills API listening on http://localhost:${port} (${store.mode} mode)`));
module.exports = app;
