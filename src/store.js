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

async function saveAction(action) {
  const record = { ...action, actionId: action.actionId || randomUUID(), createdAt: now() };
  if (store.mode === 'firebase') await store.db.collection('actions').doc(record.actionId).set(record);
  else memory.actions.set(record.actionId, record);
  return record;
}

module.exports = { store, createRun, getRun, updateRun, saveAction };
