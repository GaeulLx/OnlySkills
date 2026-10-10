const admin = require('firebase-admin');
const { randomUUID } = require('node:crypto');
const memory = { runs: new Map(), actions: new Map() };

function initializeStore() {
  const hasCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) || Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  if (!admin.apps.length && hasCredentials) {
    const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      ? admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON))
      : admin.credential.applicationDefault();
    admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID || undefined });
  }
  return admin.apps.length ? { mode: 'firebase', db: admin.firestore() } : { mode: 'memory', db: null };
}

const store = initializeStore();
const now = () => new Date().toISOString();

async function createRun(run) {
  const record = { ...run, createdAt: now(), updatedAt: now() };
  if (store.mode === 'firebase') await store.db.collection('runs').doc(run.runId).set(record);
  else memory.runs.set(run.runId, record);
  return record;
}

async function getRun(runId) {
  if (store.mode === 'firebase') {
    const doc = await store.db.collection('runs').doc(runId).get();
    return doc.exists ? doc.data() : null;
  }
  return memory.runs.get(runId) || null;
}

async function updateRun(runId, updates) {
  const patch = { ...updates, updatedAt: now() };
  if (store.mode === 'firebase') await store.db.collection('runs').doc(runId).set(patch, { merge: true });
  else if (memory.runs.has(runId)) memory.runs.set(runId, { ...memory.runs.get(runId), ...patch });
  return getRun(runId);
}

async function appendRunEvent(runId, event) {
  const entry = { ...event, at: event.at || now() };
  if (store.mode === 'firebase') {
    const ref = store.db.collection('runs').doc(runId);
    return store.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const run = snapshot.data();
      const events = Array.isArray(run.events) ? run.events : [];
      transaction.update(ref, { events: [...events, entry].slice(-100), updatedAt: now() });
      return { ...run, events: [...events, entry].slice(-100), updatedAt: now() };
    });
  }
  const run = memory.runs.get(runId);
  if (!run) return null;
  const updated = { ...run, events: [...(run.events || []), entry].slice(-100), updatedAt: now() };
  memory.runs.set(runId, updated);
  return updated;
}

async function claimNextRun(waitSeconds = 0) {
  const waitMs = Math.max(0, Math.min(Number(waitSeconds) || 0, 20) * 1000);
  const deadline = Date.now() + waitMs;
  const leaseExpired = (run) => run.status === 'running' && run.claimExpiresAt && Date.parse(run.claimExpiresAt) <= Date.now();

  do {
    if (store.mode === 'firebase') {
      const [queuedSnapshot, runningSnapshot] = await Promise.all([
        store.db.collection('runs').where('status', '==', 'queued').limit(20).get(),
        store.db.collection('runs').where('status', '==', 'running').limit(20).get()
      ]);
      const candidates = [...queuedSnapshot.docs, ...runningSnapshot.docs]
        .map((doc) => ({ ref: doc.ref, run: doc.data() }))
        .filter(({ run }) => run.status === 'queued' || leaseExpired(run))
        .sort((a, b) => String(a.run.createdAt || '').localeCompare(String(b.run.createdAt || '')));

      for (const candidate of candidates) {
        const claimed = await store.db.runTransaction(async (transaction) => {
          const current = await transaction.get(candidate.ref);
          if (!current.exists) return null;
          const run = current.data();
          if (run.status !== 'queued' && !leaseExpired(run)) return null;
          const timestamp = now();
          const events = [...(run.events || []), { step: 'WorkBuddy picked up the goal', detail: 'The WorkBuddy worker claimed this run.', at: timestamp }].slice(-100);
          const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          transaction.update(candidate.ref, {
            status: 'running',
            provider: 'workbuddy_mcp',
            claimedAt: timestamp,
            claimExpiresAt,
            updatedAt: timestamp,
            events
          });
          return { ...run, status: 'running', provider: 'workbuddy_mcp', claimedAt: timestamp, claimExpiresAt, updatedAt: timestamp, events };
        });
        if (claimed) return claimed;
      }
    } else {
      const candidate = [...memory.runs.values()]
        .filter((run) => run.status === 'queued' || leaseExpired(run))
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0];
      if (candidate) {
        const timestamp = now();
        const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const claimed = {
          ...candidate,
          status: 'running',
          provider: 'workbuddy_mcp',
          claimedAt: timestamp,
          claimExpiresAt,
          updatedAt: timestamp,
          events: [...(candidate.events || []), { step: 'WorkBuddy picked up the goal', detail: 'The WorkBuddy worker claimed this run.', at: timestamp }].slice(-100)
        };
        memory.runs.set(candidate.runId, claimed);
        return claimed;
      }
    }

    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, deadline - Date.now())));
  } while (Date.now() <= deadline);

  return null;
}

async function saveAction(action) {
  const record = { ...action, actionId: action.actionId || randomUUID(), createdAt: now() };
  if (store.mode === 'firebase') await store.db.collection('actions').doc(record.actionId).set(record);
  else memory.actions.set(record.actionId, record);
  return record;
}

module.exports = { store, createRun, getRun, updateRun, appendRunEvent, claimNextRun, saveAction };
