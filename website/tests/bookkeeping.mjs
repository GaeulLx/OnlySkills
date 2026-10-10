#!/usr/bin/env node

// Local synthetic fixtures only. These tests never call a deployed service.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseReceipt } from "../worker/receipt-parser.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationNames = (await readdir(resolve(root, "drizzle"))).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
const migrations = await Promise.all(migrationNames.map((name) => readFile(resolve(root, "drizzle", name), "utf8")));
const worker = await import(pathToFileURL(resolve(root, "worker/index.js")).href + "?bookkeeping-test=" + Date.now());

const parsedReceipt = parseReceipt("Test Store\n10/10/2026\nFlour 10.00\nSUBTOTAL RM 10.00\nSST 0.60\nGRAND TOTAL RM 10.60\nCASH TENDERED RM 20.00\nCHANGE RM 9.40");
assert.equal(parsedReceipt.merchant, "Test Store");
assert.equal(parsedReceipt.date, "2026-10-10");
assert.equal(parsedReceipt.amount, "10.60", "the parser chooses an explicit total instead of subtotal, cash tendered, or change");
assert.equal(parsedReceipt.currency, "MYR");
assert.equal(parsedReceipt.category, "Materials");
assert.ok(parsedReceipt.warnings.some((warning) => warning.includes("day/month/year")), "ambiguous numeric dates are flagged for review");
const unknownReceipt = parseReceipt("");
assert.equal(unknownReceipt.merchant, "");
assert.equal(unknownReceipt.date, "");
assert.equal(unknownReceipt.amount, "", "missing OCR fields are left blank, never fabricated");
assert.ok(unknownReceipt.warnings.length >= 3);
assert.equal(parseReceipt("Test Store\nTOTAL 12.345").amount, "", "the parser does not invent decimal precision");
assert.equal(parseReceipt("Test Store\nTOTAL -12.00").amount, "", "a negative OCR amount is not silently made positive");
assert.equal(parseReceipt("Test Store\n2026-02-30\nTOTAL 5.00").date, "", "OCR parsing rejects impossible calendar dates");

function createD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) {
    for (const statement of migration.split(/--> statement-breakpoint\s*/).map((part) => part.trim()).filter(Boolean)) sqlite.exec(statement);
  }
  function prepare(sql) {
    let values = [];
    const wrapped = {
      bind(...args) { values = args; return wrapped; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() {
        const result = sqlite.prepare(sql).run(...values);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
      sql,
      values: () => values,
    };
    return wrapped;
  }
  return {
    sqlite,
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map((statement) => {
          const prepared = sqlite.prepare(statement.sql);
          if (prepared.columns().length) return { success: true, results: prepared.all(...statement.values()), meta: { changes: 0 } };
          const result = prepared.run(...statement.values());
          return { success: true, meta: { changes: Number(result.changes) } };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

class FakeR2 {
  constructor() { this.objects = new Map(); this.puts = 0; this.deletes = 0; }
  async put(key, value, options = {}) {
    const bytes = value instanceof Blob ? new Uint8Array(await value.arrayBuffer())
      : value instanceof ArrayBuffer ? new Uint8Array(value)
      : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice()
      : new TextEncoder().encode(String(value));
    this.objects.set(key, { bytes, options });
    this.puts++;
    return { key, size: bytes.byteLength, etag: "local-test-etag" };
  }
  async get(key) {
    const item = this.objects.get(key);
    if (!item) return null;
    return {
      key,
      body: new Blob([item.bytes]).stream(),
      size: item.bytes.byteLength,
      httpMetadata: item.options.httpMetadata || {},
      customMetadata: item.options.customMetadata || {},
      async arrayBuffer() { return item.bytes.slice().buffer; },
      writeHttpMetadata(headers) {
        if (item.options.httpMetadata?.contentType) headers.set("content-type", item.options.httpMetadata.contentType);
      },
    };
  }
  async delete(key) { this.objects.delete(key); this.deletes++; }
}

const origin = "https://onlyskill.test";
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
];
const keys = ["a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)];
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);

function createEnv() { return { DB: createD1(), BUCKET: new FakeR2() }; }

async function call(env, path, { method = "GET", device = ids[0], key = keys[0], body, requestOrigin = origin, headers = {} } = {}) {
  const requestHeaders = new Headers(headers);
  if (device !== null) requestHeaders.set("x-onlyskill-device", device);
  if (key !== null) requestHeaders.set("x-bookkeeping-key", key);
  if (requestOrigin !== null) requestHeaders.set("origin", requestOrigin);
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    requestHeaders.set("content-type", "application/json");
    body = JSON.stringify(body);
  }
  const response = await worker.default.fetch(new Request(origin + path, { method, headers: requestHeaders, body }), env);
  const copy = response.clone();
  let data;
  try { data = await copy.json(); } catch (_) { data = null; }
  return { response, data };
}

function entryForm(overrides = {}, receipt) {
  const values = {
    id: crypto.randomUUID(), scope: "personal", kind: "expense", date: "2026-10-10",
    merchant: "Local test merchant", amount: "12.34", currency: "MYR", category: "Materials",
    note: "Synthetic fixture", ocrText: "", reviewed: "true", ...overrides,
  };
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) if (value !== undefined) form.set(name, String(value));
  if (receipt) form.set("receipt", new Blob([receipt.bytes || png], { type: receipt.type || "image/png" }), receipt.name || "receipt.png");
  return form;
}

async function openSession(env, index = 0) {
  const result = await call(env, "/api/books/session", { method: "POST", device: ids[index], key: keys[index] });
  assert.equal(result.response.status, 200, "a first private bookkeeping capability creates the browser session");
  return result.data;
}

function assertStatus(result, expected, message) {
  assert.equal(result.response.status, expected, message + " — " + JSON.stringify(result.data));
}

function assertDenied(result, message) {
  assert.ok([403, 404].includes(result.response.status), message + " — " + result.response.status + " " + JSON.stringify(result.data));
}

function assertCreated(result, message) {
  assert.ok([200, 201].includes(result.response.status), message + " — " + result.response.status + " " + JSON.stringify(result.data));
  assert.ok(result.data?.entry?.id, "successful save returns the actual persisted entry");
  return result.data.entry;
}

const env = createEnv();
assertStatus(await call(env, "/api/books/session", { method: "POST", device: null }), 401, "a device identifier is required");
assertStatus(await call(env, "/api/books/session", { method: "POST", key: null }), 401, "the private capability is required");
assertStatus(await call(env, "/api/books/session", { method: "POST", device: "not-a-device" }), 401, "invalid device identifiers are rejected");
assertStatus(await call(env, "/api/books/session", { method: "POST", key: "short" }), 401, "short capabilities are rejected");
const unbound = await call(env, "/api/books/entries?scope=personal");
assert.ok([401, 403].includes(unbound.response.status), "reading an unbound browser capability is denied");
assertStatus(await call(env, "/api/books/session", { method: "POST", requestOrigin: "https://untrusted.test" }), 403, "foreign origins cannot bind browser capabilities");

const session = await openSession(env);
assert.deepEqual(session.scopes, [{ id: "personal", label: "My bookkeeping" }], "an unmatched phone has only its own bookkeeping scope");
assert.equal(JSON.stringify(session).includes(keys[0]), false, "the response never returns a private capability");
assertStatus(await call(env, "/api/books/session", { method: "POST", key: keys[1] }), 403, "an already bound phone cannot be reclaimed using a different key");
assertStatus(await call(env, "/api/books/entries?scope=personal", { key: keys[1] }), 403, "a wrong private key cannot read bookkeeping");
assertStatus(await call(env, "/api/books/entries?scope=personal", { requestOrigin: "https://untrusted.test" }), 403, "foreign origins cannot read bookkeeping");
const sessionRows = env.DB.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'book%'").all();
assert.ok(sessionRows.length >= 2, "bookkeeping persistence migrations have been applied");
const persisted = sessionRows.flatMap(({ name }) => env.DB.sqlite.prepare(`SELECT * FROM "${name}"`).all());
assert.equal(JSON.stringify(persisted).includes(keys[0]), false, "database records never store the raw browser capability");

const manualId = crypto.randomUUID();
let result = await call(env, "/api/books/entries", { method: "POST", body: entryForm({ id: manualId }) });
const manual = assertCreated(result, "a reviewed manual expense can be saved without uploading a receipt");
assert.equal(result.response.status, 201);
assert.equal(result.data.duplicate, false);
assert.equal(manual.id, manualId);
assert.equal(manual.amountMinor, 1234);
assert.equal(manual.hasReceipt, false);
assert.equal(manual.status, "posted");
assert.equal(manual.isMine, true);
assert.equal(env.BUCKET.objects.size, 0, "manual entry does not create an empty R2 object");

const receiptId = crypto.randomUUID();
result = await call(env, "/api/books/entries", {
  method: "POST", body: entryForm({ id: receiptId, amount: "23.45", ocrText: "Synthetic test receipt\nTOTAL 23.45" }, {}),
});
const attachment = assertCreated(result, "a reviewed image receipt and its expense save together");
assert.equal(attachment.amountMinor, 2345);
assert.equal(attachment.hasReceipt, true);
assert.equal(attachment.receiptName, "receipt.png");
assert.equal(env.BUCKET.objects.size, 1);
assert.equal(JSON.stringify(attachment).includes("receiptKey"), false, "object storage keys are not exposed to browser clients");

result = await call(env, "/api/books/entries/" + receiptId + "/receipt");
assertStatus(result, 200, "the owning device can download the original private receipt");
assert.deepEqual(new Uint8Array(await result.response.arrayBuffer()), png);
assert.equal(result.response.headers.get("content-type"), "image/png");
assert.match(result.response.headers.get("content-disposition") || "", /^attachment;/, "receipt downloads do not execute inline");
assert.equal(result.response.headers.get("x-content-type-options"), "nosniff");
assert.match(result.response.headers.get("cache-control") || "", /no-store|private/);

const beforeInvalid = env.BUCKET.objects.size;
for (const [overrides, message] of [
  [{ reviewed: "false" }, "unreviewed OCR cannot be posted"],
  [{ reviewed: undefined }, "explicit review confirmation is mandatory"],
  [{ date: "2026-02-30" }, "impossible calendar dates are rejected"],
  [{ date: "2025-02-29" }, "non-leap February 29 is rejected"],
  [{ date: "2026-10-10T12:00:00Z" }, "timestamp text is not treated as an accounting date"],
  [{ amount: "0" }, "zero-value postings are rejected"],
  [{ amount: "-1.00" }, "negative postings cannot bypass income/expense direction"],
  [{ amount: "1.234" }, "fractional minor currency units are rejected"],
  [{ amount: "1e2" }, "scientific amount notation is rejected"],
  [{ amount: "Infinity" }, "non-finite amounts are rejected"],
  [{ amount: "100000000.00" }, "the amount limit is enforced"],
  [{ currency: "JPY" }, "unsupported currency precision is not guessed"],
  [{ kind: "transfer" }, "unknown transaction types are rejected"],
  [{ category: "Unknown" }, "unknown categories are rejected"],
  [{ merchant: "x".repeat(121) }, "merchant text length is bounded"],
  [{ note: "x".repeat(501) }, "note text length is bounded"],
  [{ ocrText: "x".repeat(20001) }, "OCR text length is bounded"],
  [{ id: "invalid-entry-id" }, "entry IDs must be valid retry-safe UUIDs"],
]) {
  assertStatus(await call(env, "/api/books/entries", { method: "POST", body: entryForm(overrides, {}) }), 400, message);
}
assert.equal(env.BUCKET.objects.size, beforeInvalid, "invalid reviewed fields never write receipt objects");
const invalidFiles = [
  [{ type: "image/jpeg", name: "spoof.jpg", bytes: png }, "a claimed MIME type must match the file signature"],
  [{ type: "image/png", name: "bad.png", bytes: new TextEncoder().encode("<html>not an image</html>") }, "HTML cannot masquerade as a receipt"],
  [{ type: "text/html", name: "receipt.html", bytes: png }, "unsupported MIME types are rejected"],
  [{ type: "image/png", name: "large.png", bytes: new Uint8Array(8 * 1024 * 1024 + 1).fill(1) }, "receipt upload size is capped at 8 MiB"],
];
for (const [file, message] of invalidFiles) {
  const rejected = await call(env, "/api/books/entries", { method: "POST", body: entryForm({}, file) });
  assert.ok([400, 413].includes(rejected.response.status), message + " — " + rejected.response.status);
}
assert.equal(env.BUCKET.objects.size, beforeInvalid, "rejected uploads never create objects");

const retryPuts = env.BUCKET.puts;
result = await call(env, "/api/books/entries", {
  method: "POST", body: entryForm({ id: receiptId, amount: "23.45", ocrText: "Synthetic test receipt\nTOTAL 23.45" }, {}),
});
assert.equal(assertCreated(result, "a network retry returns the previously persisted entry").id, receiptId);
assert.equal(result.response.status, 200);
assert.equal(result.data.duplicate, true);
assert.equal(env.BUCKET.puts, retryPuts, "an identical retry does not re-upload the receipt");
assertStatus(await call(env, "/api/books/entries", {
  method: "POST", body: entryForm({ id: receiptId, amount: "23.46", ocrText: "Synthetic test receipt\nTOTAL 23.45" }, {}),
}), 409, "the same retry ID cannot overwrite previously posted amounts");
assertStatus(await call(env, "/api/books/entries", {
  method: "POST", body: entryForm({ id: receiptId, amount: "23.45", ocrText: "Synthetic test receipt\nTOTAL 23.45" }, { bytes: new Uint8Array([...png, 1]) }),
}), 409, "receipt content participates in retry conflict checking");

await openSession(env, 1);
assertStatus(await call(env, "/api/books/entries?scope=personal", { device: ids[1], key: keys[0] }), 403, "another bound device cannot use the owner's capability");
result = await call(env, "/api/books/entries?scope=personal", { device: ids[1], key: keys[1] });
assertStatus(result, 200, "the other device can read only its own personal ledger");
assert.deepEqual(result.data.entries, [], "personal entries are not shared between phones");
assertDenied(await call(env, "/api/books/entries/" + receiptId + "/receipt", { device: ids[1], key: keys[1] }), "another device cannot download a personal receipt");
assertDenied(await call(env, "/api/books/entries/" + receiptId + "/void", { method: "POST", device: ids[1], key: keys[1] }), "another device cannot void a personal entry");

result = await call(env, "/api/books/entries/" + receiptId + "/void", { method: "POST" });
assertStatus(result, 200, "the entry owner can void a posting");
assert.equal(result.data.entry.status, "void");
assertStatus(await call(env, "/api/books/entries/" + receiptId + "/void", { method: "POST" }), 200, "repeated void requests are idempotent");
result = await call(env, "/api/books/entries?scope=personal");
assertStatus(result, 200, "listing returns the saved audit history");
assert.equal(result.data.entries.find((entry) => entry.id === receiptId).status, "void", "voided entries are retained, not deleted");
assert.equal(result.data.total, 2, "identical retries did not create duplicate ledger rows");
assert.deepEqual(result.data.totals, [{ currency: "MYR", incomeMinor: 0, expenseMinor: 1234, balanceMinor: -1234 }], "voided values no longer contribute to totals");
assert.equal(env.BUCKET.objects.size, 1, "voiding keeps the original document for the audit record");

const formatsEnv = createEnv();
await openSession(formatsEnv);
for (const file of [
  { type: "application/pdf", name: "receipt.pdf", bytes: new TextEncoder().encode("%PDF-1.7\n% Local synthetic receipt fixture\n%%EOF\n") },
  { type: "image/jpeg", name: "receipt.jpg", bytes: new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0]) },
  { type: "image/webp", name: "receipt.webp", bytes: new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32]) },
]) {
  const saved = assertCreated(await call(formatsEnv, "/api/books/entries", { method: "POST", body: entryForm({}, file) }), "supported signature-checked receipt formats save");
  const downloaded = await call(formatsEnv, "/api/books/entries/" + saved.id + "/receipt");
  assertStatus(downloaded, 200, "the private saved receipt can be downloaded");
  assert.equal(downloaded.response.headers.get("content-type"), file.type);
}
assertCreated(await call(formatsEnv, "/api/books/entries", { method: "POST", body: entryForm({ date: "2024-02-29" }) }), "a real leap-day date is accepted");
const storageDisabled = createEnv();
delete storageDisabled.BUCKET;
await openSession(storageDisabled);
assertCreated(await call(storageDisabled, "/api/books/entries", { method: "POST", body: entryForm() }), "manual bookkeeping works even if file storage is unavailable");
assertStatus(await call(storageDisabled, "/api/books/entries", { method: "POST", body: entryForm({}, {}) }), 503, "missing private file storage produces an explicit error instead of losing the receipt");

const exactEnv = createEnv();
await openSession(exactEnv);
for (const values of [
  { amount: "0.10" }, { amount: "0.20" }, { amount: "0.30", kind: "income", category: "Sales" },
  { amount: "50.00", kind: "income", currency: "USD", category: "Sales" },
  { amount: "3.25", currency: "USD" },
]) assertCreated(await call(exactEnv, "/api/books/entries", { method: "POST", body: entryForm(values) }), "valid exact currency amount saves");
result = await call(exactEnv, "/api/books/entries?scope=personal");
assert.deepEqual(result.data.totals, [
  { currency: "MYR", incomeMinor: 30, expenseMinor: 30, balanceMinor: 0 },
  { currency: "USD", incomeMinor: 5000, expenseMinor: 325, balanceMinor: 4675 },
], "totals use exact integer minor units and never combine currencies");

function profile(deviceId, role) {
  return {
    deviceId, role, displayName: role,
    skills: role === "Product Creator" ? ["product design", "baking"] : role === "Marketing" ? ["marketing", "content"] : ["sales", "orders"],
    interests: ["university students", "food business"], businessGoal: "Sell homemade chili sauce to university students",
    availabilityHours: 5, availabilitySlots: ["weekends"],
  };
}

const teamEnv = createEnv();
for (let index = 0; index < ids.length; index++) await openSession(teamEnv, index);
const roles = ["Product Creator", "Marketing", "Sales"];
let proposal;
for (let index = 0; index < roles.length; index++) {
  proposal = await call(teamEnv, "/api/matching/profile", { method: "POST", body: profile(ids[index], roles[index]) });
  assertStatus(proposal, 200, "existing profile matching still works");
}
const matchingId = proposal.data.team.id;
let teamSession = await openSession(teamEnv);
assert.equal(teamSession.scopes.some((scope) => scope.id === "matching:" + matchingId), false, "an unaccepted invitation does not unlock team bookkeeping");
for (let index = 0; index < roles.length; index++) {
  assertStatus(await call(teamEnv, "/api/matching/decision", { method: "POST", body: { deviceId: ids[index], teamId: matchingId, action: "accept" } }), 200, "existing invitations still accept");
}
const matchingScope = "matching:" + matchingId;
teamSession = await openSession(teamEnv);
assert.equal(teamSession.scopes.some((scope) => scope.id === matchingScope), true, "a complete active accepted team unlocks its shared ledger");
const sharedId = crypto.randomUUID();
assertCreated(await call(teamEnv, "/api/books/entries", { method: "POST", body: entryForm({ id: sharedId, scope: matchingScope }, {}) }), "a current accepted member saves to the matching team ledger");
result = await call(teamEnv, "/api/books/entries?scope=" + encodeURIComponent(matchingScope), { device: ids[1], key: keys[1] });
assertStatus(result, 200, "a teammate sees the same shared ledger");
assert.equal(result.data.entries.length, 1);
assert.equal(result.data.entries[0].isMine, false, "teammate entries are clearly not owned by the viewing phone");
assertStatus(await call(teamEnv, "/api/books/entries/" + sharedId + "/receipt", { device: ids[1], key: keys[1] }), 200, "a current teammate can download a team receipt");
assertDenied(await call(teamEnv, "/api/books/entries/" + sharedId + "/void", { method: "POST", device: ids[1], key: keys[1] }), "a teammate cannot void another member's posting");
assertDenied(await call(teamEnv, "/api/books/entries?scope=" + encodeURIComponent(matchingScope), { device: ids[3], key: keys[3] }), "an outsider cannot read a matching-team ledger");
assertDenied(await call(teamEnv, "/api/books/entries", { method: "POST", device: ids[3], key: keys[3], body: entryForm({ scope: matchingScope }) }), "an outsider cannot post into a matching team");
assertDenied(await call(teamEnv, "/api/books/entries/" + sharedId + "/receipt", { device: ids[3], key: keys[3] }), "an outsider cannot fetch a private team receipt by ID");
assertStatus(await call(teamEnv, "/api/matching/cancel", { method: "POST", body: { deviceId: ids[0], teamId: matchingId } }), 200, "existing team cancellation still works");
for (let index = 0; index < roles.length; index++) {
  assert.equal((await openSession(teamEnv, index)).scopes.some((scope) => scope.id === matchingScope), false, "cancelling removes team scopes from every member");
  assertDenied(await call(teamEnv, "/api/books/entries?scope=" + encodeURIComponent(matchingScope), { device: ids[index], key: keys[index] }), "former matching members lose shared-ledger access");
  assertDenied(await call(teamEnv, "/api/books/entries/" + sharedId + "/receipt", { device: ids[index], key: keys[index] }), "cancelled-team receipt access is checked on every download");
}
assert.equal(teamEnv.BUCKET.objects.size, 1, "team cancellation does not erase the archived receipt");

const demoEnv = createEnv();
for (let index = 0; index < ids.length; index++) await openSession(demoEnv, index);
for (let index = 0; index < roles.length; index++) {
  const joined = await call(demoEnv, "/api/join", {
    method: "POST", body: { deviceId: ids[index], role: roles[index], displayName: "Test " + roles[index], productName: index === 0 ? "Test chili sauce" : "" },
  });
  assertStatus(joined, 200, "existing three-phone Team-up still works");
  if (index < 2) assert.equal((await openSession(demoEnv)).scopes.some((scope) => scope.id.startsWith("demo:")), false, "an incomplete Team-up cannot use shared books");
}
const demoScope = (await openSession(demoEnv)).scopes.find((scope) => scope.id.startsWith("demo:"))?.id;
assert.ok(demoScope, "the complete three-phone Team-up has a shared bookkeeping scope");
const demoReceiptId = crypto.randomUUID();
assertCreated(await call(demoEnv, "/api/books/entries", { method: "POST", body: entryForm({ id: demoReceiptId, scope: demoScope }, {}) }), "a current demo-group member saves a receipt");
assertStatus(await call(demoEnv, "/api/books/entries?scope=" + encodeURIComponent(demoScope), { device: ids[2], key: keys[2] }), 200, "the other Team-up positions share the same group ledger");
assertDenied(await call(demoEnv, "/api/books/entries?scope=" + encodeURIComponent(demoScope), { device: ids[3], key: keys[3] }), "the Team-up scope is not public even though its team screen is public");
demoEnv.DB.sqlite.prepare("UPDATE demo_members SET joined_at = ?").run(Date.now() - 4 * 60 * 60 * 1000 - 1000);
assert.equal((await openSession(demoEnv)).scopes.some((scope) => scope.id === demoScope), false, "the four-hour idle Team-up no longer grants bookkeeping access");
assertDenied(await call(demoEnv, "/api/books/entries?scope=" + encodeURIComponent(demoScope)), "expired Team-up ledger access is rejected without needing a frontend refresh");
assertDenied(await call(demoEnv, "/api/books/entries/" + demoReceiptId + "/receipt"), "expired Team-up receipt access is rejected on download");
assertDenied(await call(demoEnv, "/api/books/entries/" + demoReceiptId + "/void", { method: "POST" }), "expired group membership cannot authorize mutations");
assert.equal(demoEnv.BUCKET.objects.size, 1, "idle group expiration retains bookkeeping audit documents");

const csvEnv = createEnv();
await openSession(csvEnv);
const csvId = crypto.randomUUID();
assertCreated(await call(csvEnv, "/api/books/entries", {
  method: "POST", body: entryForm({ id: csvId, merchant: '=HYPERLINK("https://untrusted.test")', note: "\t-2+3" }),
}), "formula-shaped merchant and note text is stored as ordinary text");
assertStatus(await call(csvEnv, "/api/books/entries/" + csvId + "/void", { method: "POST" }), 200, "CSV audit fixture can be voided");
result = await call(csvEnv, "/api/books/export?scope=personal");
assertStatus(result, 200, "the owner can export its ledger audit to CSV");
assert.match(result.response.headers.get("content-type") || "", /^text\/csv/);
assert.match(result.response.headers.get("content-disposition") || "", /^attachment;.*\.csv/);
assert.match(result.response.headers.get("cache-control") || "", /no-store|private/);
assert.equal(result.response.headers.get("x-content-type-options"), "nosniff");
const csv = await result.response.text();
assert.match(csv, /void/i, "void audit rows remain visible in exported books");
assert.match(csv, /'=HYPERLINK/, "spreadsheet formulas in merchant text are neutralized");
assert.match(csv, /'[-\t]/, "leading whitespace/control-prefix formula text is neutralized");
assert.equal(csv.includes(keys[0]), false, "exports never include session capabilities");
assert.equal(csv.includes(ids[0]), false, "exports do not expose device identifiers");

const paginationEnv = createEnv();
await openSession(paginationEnv);
for (let index = 0; index < 51; index++) {
  assertCreated(await call(paginationEnv, "/api/books/entries", { method: "POST", body: entryForm({ amount: "0.01", note: "Pagination fixture " + index }) }), "local pagination fixture saves");
}
const firstPage = await call(paginationEnv, "/api/books/entries?scope=personal&offset=0");
assertStatus(firstPage, 200, "the first ledger page loads");
assert.equal(firstPage.data.entries.length, 50);
assert.equal(firstPage.data.total, 51);
assert.equal(firstPage.data.nextOffset, 50);
assert.deepEqual(firstPage.data.totals, [{ currency: "MYR", incomeMinor: 0, expenseMinor: 51, balanceMinor: -51 }], "totals cover the entire ledger, not just the displayed page");
const lastPage = await call(paginationEnv, "/api/books/entries?scope=personal&offset=50");
assert.equal(lastPage.data.entries.length, 1);
assert.equal(lastPage.data.nextOffset, null);
assert.equal(firstPage.data.entries.some((entry) => entry.id === lastPage.data.entries[0].id), false, "pagination does not repeat records");
for (const offset of ["-1", "1.5", "NaN", "01"]) {
  assertStatus(await call(paginationEnv, "/api/books/entries?scope=personal&offset=" + offset), 400, "invalid page offsets cannot change query semantics");
}

const failureEnv = createEnv();
await openSession(failureEnv);
const originalPrepare = failureEnv.DB.prepare.bind(failureEnv.DB);
failureEnv.DB.prepare = (sql) => {
  const statement = originalPrepare(sql);
  if (/^INSERT INTO bookkeeping_entries/i.test(sql.trim())) statement.run = async () => { throw new Error("Synthetic database failure"); };
  return statement;
};
assertStatus(await call(failureEnv, "/api/books/entries", { method: "POST", body: entryForm({}, {}) }), 503, "database failures return a retryable error");
assert.equal(failureEnv.BUCKET.objects.size, 0, "failed database writes clean up the newly uploaded receipt");
assert.equal(failureEnv.BUCKET.deletes, 1);

const uncertainCommitEnv = createEnv();
await openSession(uncertainCommitEnv);
const commitPrepare = uncertainCommitEnv.DB.prepare.bind(uncertainCommitEnv.DB);
let interruptedCommit = false;
uncertainCommitEnv.DB.prepare = (sql) => {
  const statement = commitPrepare(sql);
  if (/^INSERT INTO bookkeeping_entries/i.test(sql.trim())) {
    const run = statement.run.bind(statement);
    statement.run = async () => {
      const saved = await run();
      if (!interruptedCommit) { interruptedCommit = true; throw new Error("Synthetic lost response after committed insert"); }
      return saved;
    };
  }
  return statement;
};
const committedId = crypto.randomUUID();
assertCreated(await call(uncertainCommitEnv, "/api/books/entries", { method: "POST", body: entryForm({ id: committedId }, {}) }), "a verified committed insert recovers from a lost database acknowledgement");
assert.equal(uncertainCommitEnv.BUCKET.objects.size, 1, "a verified committed receipt is not deleted during uncertain-error cleanup");
assert.equal(uncertainCommitEnv.BUCKET.deletes, 0);
assertStatus(await call(uncertainCommitEnv, "/api/books/entries/" + committedId + "/receipt"), 200, "the recovered committed receipt still exists");
assertStatus(await call(uncertainCommitEnv, "/api/books/entries", { method: "POST", body: entryForm({ id: committedId }, {}) }), 200, "retrying a recovered commit remains idempotent");
assert.equal(uncertainCommitEnv.BUCKET.objects.size, 1);
assert.equal(uncertainCommitEnv.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM bookkeeping_entries").get().n, 1);

const membershipRaceEnv = createEnv();
await openSession(membershipRaceEnv);
for (let index = 0; index < roles.length; index++) {
  assertStatus(await call(membershipRaceEnv, "/api/join", { method: "POST", body: { deviceId: ids[index], role: roles[index], displayName: roles[index], productName: index === 0 ? "Local race fixture" : "" } }), 200, "local membership-race fixtures join");
}
const raceScope = (await openSession(membershipRaceEnv)).scopes.find((scope) => scope.id.startsWith("demo:"))?.id;
const originalPut = membershipRaceEnv.BUCKET.put.bind(membershipRaceEnv.BUCKET);
membershipRaceEnv.BUCKET.put = async (...args) => {
  const saved = await originalPut(...args);
  membershipRaceEnv.DB.sqlite.prepare("UPDATE demo_members SET joined_at = ?").run(Date.now() - 4 * 60 * 60 * 1000 - 1000);
  return saved;
};
assertStatus(await call(membershipRaceEnv, "/api/books/entries", { method: "POST", body: entryForm({ scope: raceScope }, {}) }), 403, "membership is rechecked after uploading and before saving");
assert.equal(membershipRaceEnv.BUCKET.objects.size, 0, "a cancelled or expired membership cannot leave an orphaned upload");
assert.equal(membershipRaceEnv.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM bookkeeping_entries").get().n, 0);

async function uploadRace(conflicting) {
  const raceEnv = createEnv();
  await openSession(raceEnv);
  const put = raceEnv.BUCKET.put.bind(raceEnv.BUCKET);
  let arrivals = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const deadline = setTimeout(release, 5000);
  raceEnv.BUCKET.put = async (...args) => {
    const saved = await put(...args);
    arrivals++;
    if (arrivals === 2) release();
    await gate;
    return saved;
  };
  const id = crypto.randomUUID();
  const outcomes = await Promise.all([
    call(raceEnv, "/api/books/entries", { method: "POST", body: entryForm({ id }, {}) }),
    call(raceEnv, "/api/books/entries", { method: "POST", body: entryForm({ id }, conflicting ? { bytes: new Uint8Array([...png, 1]) } : {}) }),
  ]);
  clearTimeout(deadline);
  assert.equal(arrivals, 2, "the test forced both requests to upload before either database insert");
  assert.deepEqual(outcomes.map((outcome) => outcome.response.status).sort(), conflicting ? [201, 409] : [200, 201], "concurrent identical retries recover the winner, while conflicting receipts are rejected");
  assert.equal(raceEnv.BUCKET.objects.size, 1, "the losing concurrent request deletes only its own upload");
  assert.equal(raceEnv.BUCKET.deletes, 1);
  assert.equal(raceEnv.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM bookkeeping_entries").get().n, 1, "concurrent retries persist exactly one ledger entry");
  const downloaded = await call(raceEnv, "/api/books/entries/" + id + "/receipt");
  assertStatus(downloaded, 200, "the winning receipt remains downloadable after race cleanup");
  const winner = outcomes.findIndex((outcome) => outcome.response.status === 201);
  assert.deepEqual(new Uint8Array(await downloaded.response.arrayBuffer()), conflicting && winner === 1 ? new Uint8Array([...png, 1]) : png, "the losing upload cannot overwrite the winning receipt bytes");
}
await uploadRace(false);
await uploadRace(true);

const exportBoundEnv = createEnv();
await openSession(exportBoundEnv);
const seedId = crypto.randomUUID();
assertCreated(await call(exportBoundEnv, "/api/books/entries", { method: "POST", body: entryForm({ id: seedId }) }), "a local export bound fixture saves");
const copyRecord = exportBoundEnv.DB.sqlite.prepare(`INSERT INTO bookkeeping_entries
  (id, scope_key, owner_device, kind, entry_date, merchant, amount_minor, currency, category, note, ocr_text, payload_hash, receipt_key, receipt_name, receipt_type, receipt_size, status, created_at, voided_at)
  SELECT ?, scope_key, owner_device, kind, entry_date, merchant, amount_minor, currency, category, note, ocr_text, payload_hash, receipt_key, receipt_name, receipt_type, receipt_size, status, created_at, voided_at
  FROM bookkeeping_entries WHERE id = ?`);
exportBoundEnv.DB.sqlite.exec("BEGIN IMMEDIATE");
for (let index = 0; index < 4999; index++) copyRecord.run(crypto.randomUUID(), seedId);
exportBoundEnv.DB.sqlite.exec("COMMIT");
assertStatus(await call(exportBoundEnv, "/api/books/export?scope=personal"), 200, "exactly 5,000 audit records can be exported");
copyRecord.run(crypto.randomUUID(), seedId);
assertStatus(await call(exportBoundEnv, "/api/books/export?scope=personal"), 413, "an oversized CSV export fails explicitly instead of silently dropping records");

console.log("Bookkeeping tests passed: capability authorization, reviewed uploads, validation, exact totals, pagination, retry races, storage cleanup, void audit, team scopes, private receipts, and safe bounded CSV.");


