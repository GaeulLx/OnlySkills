const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENCIES = new Set(["MYR", "SGD", "USD", "EUR", "GBP"]);
const CATEGORIES = new Set(["Materials", "Packaging", "Marketing", "Transport", "Sales", "Other"]);
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_RECEIPT_BYTES + 64 * 1024;
const DEMO_TTL_MS = 4 * 60 * 60 * 1000;
const PAGE_SIZE = 50;

class BookError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff",
  } });
}

async function sha256(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function identity(request, url) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new BookError(403, "Bookkeeping requests must come from this app's own origin.");
  const device = request.headers.get("x-onlyskill-device") || "";
  const key = request.headers.get("x-bookkeeping-key") || "";
  if (!UUID.test(device) || !/^[0-9a-f]{64}$/.test(key)) throw new BookError(401, "Open Bookkeeping on your device to establish a private session.");
  return { device: device.toLowerCase(), key };
}

async function authenticate(db, actor, create = false) {
  const keyHash = await sha256(actor.key);
  if (create) await db.prepare("INSERT INTO bookkeeping_accounts (device_id, capability_hash, created_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO NOTHING").bind(actor.device, keyHash, Date.now()).run();
  const account = await db.prepare("SELECT capability_hash FROM bookkeeping_accounts WHERE device_id = ?").bind(actor.device).first();
  if (!account || !safeEqual(account.capability_hash, keyHash)) throw new BookError(403, "This bookkeeping session is not authorized. Use the original browser on this device; clearing its storage loses access.");
}

// Membership predicates are embedded in writes too: cancelling a team cannot leave a stale posting permission.
function scopeAccess(scope, device) {
  if (scope === "personal") return { key: `personal:${device}`, predicate: "1 = 1", parameters: [] };
  if (typeof scope !== "string") throw new BookError(400, "Choose a bookkeeping scope.");
  const [type, id, extra] = scope.split(":");
  if (extra !== undefined || !UUID.test(id || "") || !["matching", "demo"].includes(type)) throw new BookError(400, "The bookkeeping scope is invalid.");
  const normalizedId = id.toLowerCase();
  if (type === "matching") return {
    key: `matching:${normalizedId}`,
    predicate: `EXISTS (SELECT 1 FROM matching_team_members bm JOIN matching_teams bt ON bt.id = bm.team_id
      WHERE bm.team_id = ? AND bm.user_id = ? AND bm.status = 'accepted' AND bt.status = 'active'
      AND bt.accepted_count = 3 AND bt.accepted_product_creator = 1 AND bt.accepted_marketing = 1 AND bt.accepted_sales = 1
      AND (SELECT COUNT(*) FROM matching_team_members members WHERE members.team_id = bt.id AND members.status = 'accepted') = 3
      AND (SELECT COUNT(DISTINCT members.role) FROM matching_team_members members WHERE members.team_id = bt.id AND members.status = 'accepted' AND members.role IN ('Product Creator', 'Marketing', 'Sales')) = 3)`,
    parameters: [normalizedId, device],
  };
  return {
    key: `demo:${normalizedId}`,
    predicate: `EXISTS (SELECT 1 FROM demo_members dm WHERE dm.group_id = ? AND dm.device_id = ?
      AND (SELECT COUNT(*) FROM demo_members members WHERE members.group_id = dm.group_id) = 3
      AND (SELECT COUNT(DISTINCT members.role) FROM demo_members members WHERE members.group_id = dm.group_id AND members.role IN ('Product Creator', 'Marketing', 'Sales')) = 3
      AND (SELECT MAX(members.joined_at) FROM demo_members members WHERE members.group_id = dm.group_id) >= ?
      AND EXISTS (SELECT 1 FROM demo_members creator WHERE creator.group_id = dm.group_id AND creator.role = 'Product Creator' AND creator.product_name != ''))`,
    parameters: [normalizedId, device, Date.now() - DEMO_TTL_MS],
  };
}

async function requireScope(db, scope, device) {
  const access = scopeAccess(scope, device);
  if (!await db.prepare(`SELECT 1 AS allowed WHERE ${access.predicate}`).bind(...access.parameters).first()) throw new BookError(403, "You are not a current member of this team. Its receipts and books are private.");
  return access;
}

function publicScope(scopeKey, device) {
  if (scopeKey === `personal:${device}`) return "personal";
  if (scopeKey.startsWith("personal:")) throw new BookError(403, "This receipt belongs to another person's private books.");
  return scopeKey;
}

async function session(db, actor) {
  const scopes = [{ id: "personal", label: "My bookkeeping" }];
  const matching = await db.prepare(`SELECT DISTINCT bt.id FROM matching_teams bt JOIN matching_team_members bm ON bm.team_id = bt.id
    WHERE bt.status = 'active' AND bm.status = 'accepted' AND bm.user_id = ?`).bind(actor.device).all();
  for (const team of matching.results || []) {
    const scope = `matching:${team.id}`;
    try { await requireScope(db, scope, actor.device); scopes.push({ id: scope, label: "Matching team" }); }
    catch (error) { if (!(error instanceof BookError)) throw error; }
  }
  const demo = await db.prepare("SELECT group_id FROM demo_members WHERE device_id = ? AND group_id != ''").bind(actor.device).first();
  if (demo) {
    const scope = `demo:${demo.group_id}`;
    try { await requireScope(db, scope, actor.device); scopes.push({ id: scope, label: "Team-up group" }); }
    catch (error) { if (!(error instanceof BookError)) throw error; }
  }
  for (const scope of scopes) {
    if (scope.id.startsWith("matching:") || scope.id.startsWith("demo:")) {
      scope.label = scope.id.startsWith("matching:") ? "Shared team books · visible to all 3 members" : "Shared group books · visible to all 3 members";
    }
  }
  return json({ scopes });
}

function textField(form, name, maxLength, required = false) {
  const raw = form.get(name);
  if (raw !== null && typeof raw !== "string") throw new BookError(400, `${name} must be text.`);
  const value = (raw || "").trim();
  if ((required && !value) || value.length > maxLength || /\u0000/.test(value)) throw new BookError(400, `${name} ${required && !value ? "is required" : `must contain at most ${maxLength} characters`}.`);
  return value;
}

function amountMinor(value) {
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) throw new BookError(400, "Amount must be a positive number with at most two decimal places (maximum 99999999.99).");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents < 1 || cents > 9999999999) throw new BookError(400, "Amount must be greater than zero and at most 99999999.99.");
  return cents;
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 4) < "1900" || date.slice(0, 4) > "9999") return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

async function boundedBytes(request, limit, message) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new BookError(413, message);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) { await reader.cancel(); throw new BookError(413, message); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function boundedForm(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) throw new BookError(400, "Upload the entry using multipart/form-data.");
  const bytes = await boundedBytes(request, MAX_BODY_BYTES, "Receipt uploads must be 8 MB or smaller.");
  if (!bytes.length) throw new BookError(400, "The entry form is empty.");
  try { return await new Response(bytes, { headers: { "content-type": request.headers.get("content-type") } }).formData(); }
  catch { throw new BookError(400, "The receipt upload form could not be read. Please select the file again."); }
}

async function receiptFile(form) {
  const value = form.get("receipt");
  if (value === null || (typeof value !== "string" && value.size === 0 && !value.name)) return null;
  if (typeof value === "string" || typeof value.arrayBuffer !== "function") throw new BookError(400, "Choose a JPG, PNG, WebP, or PDF receipt file.");
  if (!value.size || value.size > MAX_RECEIPT_BYTES) throw new BookError(value.size > MAX_RECEIPT_BYTES ? 413 : 400, "Receipt must not be empty and must be 8 MB or smaller.");
  const bytes = new Uint8Array(await value.arrayBuffer());
  const starts = (signature) => signature.every((byte, index) => bytes[index] === byte);
  let type = "";
  let extension = "";
  if (starts([0xff, 0xd8, 0xff])) { type = "image/jpeg"; extension = "jpg"; }
  else if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) { type = "image/png"; extension = "png"; }
  else if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) { type = "application/pdf"; extension = "pdf"; }
  else if (bytes.length >= 12 && starts([0x52, 0x49, 0x46, 0x46]) && [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[8 + index] === byte)) { type = "image/webp"; extension = "webp"; }
  if (!type || value.type !== type) throw new BookError(400, "Receipt content must match its JPG, PNG, WebP, or PDF file type. Other files are not accepted.");
  const stem = String(value.name || "receipt").split(/[\\/]/).pop().replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9 _.-]/g, "_").replace(/^[ .]+|[ .]+$/g, "").slice(0, 100) || "receipt";
  return { bytes, type, name: `${stem}.${extension}`, hash: await sha256(bytes) };
}

function entryView(row, device) {
  return {
    id: row.id, kind: row.kind, date: row.entry_date, merchant: row.merchant, amountMinor: Number(row.amount_minor),
    currency: row.currency, category: row.category, note: row.note, status: row.status,
    hasReceipt: Boolean(row.receipt_key), receiptName: row.receipt_name || "", isMine: row.owner_device === device, createdAt: Number(row.created_at),
    ...(row.team_owner_name ? { ownerName: row.team_owner_name, ownerRole: row.team_owner_role || "" } : {}),
  };
}

async function createEntry(request, env, actor) {
  const form = await boundedForm(request);
  const id = textField(form, "id", 36, true).toLowerCase();
  if (!UUID.test(id)) throw new BookError(400, "A valid entry identifier is required. Please retry the form.");
  const scope = textField(form, "scope", 50, true);
  const access = await requireScope(env.DB, scope, actor.device);
  const kind = textField(form, "kind", 10, true);
  const date = textField(form, "date", 10, true);
  const merchant = textField(form, "merchant", 120, true);
  const cents = amountMinor(textField(form, "amount", 14, true));
  const currency = textField(form, "currency", 3, true);
  const category = textField(form, "category", 20, true);
  const note = textField(form, "note", 500);
  const ocrText = textField(form, "ocrText", 20000);
  if (!["income", "expense"].includes(kind)) throw new BookError(400, "Choose income or expense.");
  if (!validDate(date)) throw new BookError(400, "Use a valid calendar date in YYYY-MM-DD format (year 1900 or later).");
  if (!CURRENCIES.has(currency)) throw new BookError(400, "Choose MYR, SGD, USD, EUR, or GBP.");
  if (!CATEGORIES.has(category)) throw new BookError(400, "Choose a supported bookkeeping category.");
  if (form.get("reviewed") !== "true") throw new BookError(400, "Review and confirm the receipt details before saving. OCR suggestions are not confirmed accounts.");
  const receipt = await receiptFile(form);
  const payloadHash = await sha256(JSON.stringify([access.key, kind, date, merchant, cents, currency, category, note, ocrText, receipt?.hash || "", receipt?.name || ""]));
  const existing = await env.DB.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first();
  if (existing) {
    if (existing.owner_device !== actor.device || existing.scope_key !== access.key || existing.payload_hash !== payloadHash) throw new BookError(409, "This entry identifier was already used for different details. Start a new entry.");
    await requireScope(env.DB, scope, actor.device);
    return json({ entry: entryView(existing, actor.device), duplicate: true });
  }
  if (receipt && !env.BUCKET) throw new BookError(503, "Private receipt storage is not available yet. Please retry later or save without an attachment.");
  const objectKey = receipt ? `bookkeeping/${id}/${crypto.randomUUID()}` : null;
  let stored = false;
  try {
    if (receipt) { await env.BUCKET.put(objectKey, receipt.bytes, { httpMetadata: { contentType: receipt.type } }); stored = true; }
    const currentAccess = scopeAccess(scope, actor.device);
    const result = await env.DB.prepare(`INSERT INTO bookkeeping_entries
      (id, scope_key, owner_device, kind, entry_date, merchant, amount_minor, currency, category, note, ocr_text, payload_hash, receipt_key, receipt_name, receipt_type, receipt_size, status, created_at, voided_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, NULL WHERE ${currentAccess.predicate}
      ON CONFLICT(id) DO NOTHING`)
      .bind(id, access.key, actor.device, kind, date, merchant, cents, currency, category, note, ocrText, payloadHash, objectKey, receipt?.name || null, receipt?.type || null, receipt?.bytes.length || null, Date.now(), ...currentAccess.parameters).run();
    if (Number(result.meta?.changes ?? 0) !== 1) {
      if (stored) { await env.BUCKET.delete(objectKey); stored = false; }
      const concurrent = await env.DB.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first();
      if (concurrent?.owner_device === actor.device && concurrent.scope_key === access.key && concurrent.payload_hash === payloadHash) {
        await requireScope(env.DB, scope, actor.device);
        return json({ entry: entryView(concurrent, actor.device), duplicate: true });
      }
      if (concurrent) throw new BookError(409, "This entry identifier was already used for different details. Start a new entry.");
      throw new BookError(403, "Your team membership changed before the entry was saved. Refresh your bookkeeping scope.");
    }
  } catch (error) {
    if (stored) {
      // A response can fail after D1 has committed. Keep the attachment if the committed row is verifiable.
      let committed = null;
      try { committed = await env.DB.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first(); }
      catch { /* If no commit is verifiable, clean up the new object rather than leave an orphan. */ }
      if (committed?.receipt_key === objectKey && committed.owner_device === actor.device && committed.scope_key === access.key && committed.payload_hash === payloadHash) {
        await requireScope(env.DB, scope, actor.device);
        return json({ entry: entryView(committed, actor.device), duplicate: false }, 201);
      }
      await env.BUCKET.delete(objectKey);
    }
    throw error;
  }
  const row = await env.DB.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first();
  return json({ entry: entryView(row, actor.device), duplicate: false }, 201);
}

async function listEntries(db, actor, url) {
  const access = await requireScope(db, url.searchParams.get("scope"), actor.device);
  const shared = access.key.startsWith("matching:") || access.key.startsWith("demo:");
  const [scopeType, scopeId] = access.key.split(":");
  const rawOffset = url.searchParams.get("offset") || "0";
  if (!/^(0|[1-9]\d{0,7})$/.test(rawOffset)) throw new BookError(400, "The page offset is invalid.");
  const offset = Number(rawOffset);
  const rowSelect = shared
    ? scopeType === "matching"
      ? `SELECT e.*, p.display_name AS team_owner_name, p.role AS team_owner_role
         FROM bookkeeping_entries e LEFT JOIN matching_profiles p ON p.user_id = e.owner_device
         WHERE e.scope_key = ? AND ${access.predicate} ORDER BY e.entry_date DESC, e.created_at DESC, e.id DESC LIMIT ? OFFSET ?`
      : `SELECT e.*, dm.display_name AS team_owner_name, dm.role AS team_owner_role
         FROM bookkeeping_entries e LEFT JOIN demo_members dm ON dm.device_id = e.owner_device AND dm.group_id = ?
         WHERE e.scope_key = ? AND ${access.predicate} ORDER BY e.entry_date DESC, e.created_at DESC, e.id DESC LIMIT ? OFFSET ?`
    : `SELECT * FROM bookkeeping_entries WHERE scope_key = ? AND ${access.predicate} ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT ? OFFSET ?`;
  const rowParameters = scopeType === "demo" && shared ? [scopeId, access.key, ...access.parameters, PAGE_SIZE, offset] : [access.key, ...access.parameters, PAGE_SIZE, offset];
  const [rows, count, summaries] = await db.batch([
    db.prepare(rowSelect).bind(...rowParameters),
    db.prepare(`SELECT COUNT(*) AS total FROM bookkeeping_entries WHERE scope_key = ? AND ${access.predicate}`).bind(access.key, ...access.parameters),
    db.prepare(`SELECT currency, SUM(CASE WHEN kind = 'income' THEN amount_minor ELSE 0 END) AS income_minor, SUM(CASE WHEN kind = 'expense' THEN amount_minor ELSE 0 END) AS expense_minor
      FROM bookkeeping_entries WHERE scope_key = ? AND status = 'posted' AND ${access.predicate} GROUP BY currency ORDER BY currency`).bind(access.key, ...access.parameters),
  ]);
  const entries = (rows.results || []).map((row) => entryView(row, actor.device));
  const total = Number(count.results?.[0]?.total || 0);
  const totals = (summaries.results || []).map((row) => ({ currency: row.currency, incomeMinor: Number(row.income_minor), expenseMinor: Number(row.expense_minor), balanceMinor: Number(row.income_minor) - Number(row.expense_minor) }));
  const memberTotals = shared ? await listMemberTotals(db, access, scopeType, scopeId, actor.device) : undefined;
  return json({ entries, totals, ...(memberTotals ? { memberTotals } : {}), total, nextOffset: offset + entries.length < total ? offset + entries.length : null });
}

async function listMemberTotals(db, access, scopeType, scopeId, device) {
  const result = scopeType === "matching"
    ? await db.prepare(`
      SELECT p.display_name AS name, p.role AS role, e.currency,
        COALESCE(SUM(CASE WHEN e.kind = 'income' THEN e.amount_minor ELSE 0 END), 0) AS income_minor,
        COALESCE(SUM(CASE WHEN e.kind = 'expense' THEN e.amount_minor ELSE 0 END), 0) AS expense_minor
      FROM matching_team_members tm
      JOIN matching_teams t ON t.id = tm.team_id AND t.status = 'active'
      JOIN matching_profiles p ON p.user_id = tm.user_id
      LEFT JOIN bookkeeping_entries e ON e.scope_key = ? AND e.owner_device = tm.user_id AND e.status = 'posted'
      WHERE tm.team_id = ? AND tm.status = 'accepted'
        AND t.accepted_count = 3 AND t.accepted_product_creator = 1 AND t.accepted_marketing = 1 AND t.accepted_sales = 1
        AND (SELECT COUNT(*) FROM matching_team_members m WHERE m.team_id = t.id AND m.status = 'accepted') = 3
        AND (SELECT COUNT(DISTINCT m.role) FROM matching_team_members m WHERE m.team_id = t.id AND m.status = 'accepted' AND m.role IN ('Product Creator', 'Marketing', 'Sales')) = 3
        AND EXISTS (SELECT 1 FROM matching_team_members viewer WHERE viewer.team_id = t.id AND viewer.user_id = ? AND viewer.status = 'accepted')
      GROUP BY tm.user_id, p.display_name, p.role, e.currency
      ORDER BY CASE p.role WHEN 'Product Creator' THEN 0 WHEN 'Marketing' THEN 1 ELSE 2 END, e.currency
    `).bind(access.key, scopeId, device).all()
    : await db.prepare(`
      SELECT dm.display_name AS name, dm.role AS role, e.currency,
        COALESCE(SUM(CASE WHEN e.kind = 'income' THEN e.amount_minor ELSE 0 END), 0) AS income_minor,
        COALESCE(SUM(CASE WHEN e.kind = 'expense' THEN e.amount_minor ELSE 0 END), 0) AS expense_minor
      FROM demo_members dm
      LEFT JOIN bookkeeping_entries e ON e.scope_key = ? AND e.owner_device = dm.device_id AND e.status = 'posted'
      WHERE dm.group_id = ?
        AND (SELECT COUNT(*) FROM demo_members m WHERE m.group_id = dm.group_id) = 3
        AND (SELECT COUNT(DISTINCT m.role) FROM demo_members m WHERE m.group_id = dm.group_id AND m.role IN ('Product Creator', 'Marketing', 'Sales')) = 3
        AND (SELECT MAX(m.joined_at) FROM demo_members m WHERE m.group_id = dm.group_id) >= ?
        AND EXISTS (SELECT 1 FROM demo_members viewer WHERE viewer.group_id = dm.group_id AND viewer.device_id = ?)
        AND EXISTS (SELECT 1 FROM demo_members creator WHERE creator.group_id = dm.group_id AND creator.role = 'Product Creator' AND creator.product_name != '')
      GROUP BY dm.device_id, dm.display_name, dm.role, e.currency
      ORDER BY CASE dm.role WHEN 'Product Creator' THEN 0 WHEN 'Marketing' THEN 1 ELSE 2 END, e.currency
    `).bind(access.key, scopeId, Date.now() - DEMO_TTL_MS, device).all();
  const members = new Map();
  for (const row of result.results || []) {
    const key = row.role + "\u0000" + row.name;
    if (!members.has(key)) members.set(key, { name: row.name, role: row.role, totals: [] });
    if (row.currency) members.get(key).totals.push({ currency: row.currency, incomeMinor: Number(row.income_minor), expenseMinor: Number(row.expense_minor), balanceMinor: Number(row.income_minor) - Number(row.expense_minor) });
  }
  return [...members.values()];
}

async function getEntry(db, id, actor) {
  const row = await db.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first();
  if (!row) throw new BookError(404, "This bookkeeping entry could not be found.");
  const access = await requireScope(db, publicScope(row.scope_key, actor.device), actor.device);
  return { row, access };
}

async function downloadReceipt(env, actor, id) {
  const { row } = await getEntry(env.DB, id, actor);
  if (!row.receipt_key) throw new BookError(404, "This entry has no receipt attachment.");
  if (!env.BUCKET) throw new BookError(503, "Private receipt storage is not available. Please retry later.");
  const object = await env.BUCKET.get(row.receipt_key);
  if (!object) throw new BookError(404, "The receipt attachment could not be found.");
  await requireScope(env.DB, publicScope(row.scope_key, actor.device), actor.device);
  const filename = (row.receipt_name || "receipt").replace(/[^a-zA-Z0-9 _.-]/g, "_");
  return new Response(object.body, { headers: {
    "content-type": row.receipt_type || "application/octet-stream", "content-disposition": `attachment; filename="${filename}"`,
    "content-length": String(row.receipt_size), "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox; default-src 'none'",
  } });
}

async function voidEntry(request, db, actor, id) {
  const raw = new TextDecoder().decode(await boundedBytes(request, 2048, "The cancellation request is too large."));
  try { const parsed = raw ? JSON.parse(raw) : {}; if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON"); }
  catch { throw new BookError(400, "Send a JSON object when cancelling an entry."); }
  const { row, access } = await getEntry(db, id, actor);
  if (row.owner_device !== actor.device) throw new BookError(403, "Only the person who created this entry can void it.");
  if (row.status === "void") return json({ entry: entryView(row, actor.device), message: "This entry is already void. It remains in the audit history." });
  const result = await db.prepare(`UPDATE bookkeeping_entries SET status = 'void', voided_at = ? WHERE id = ? AND owner_device = ? AND status = 'posted' AND ${access.predicate}`).bind(Date.now(), id, actor.device, ...access.parameters).run();
  if (Number(result.meta?.changes ?? 0) !== 1) {
    await requireScope(db, publicScope(row.scope_key, actor.device), actor.device);
    const current = await db.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first();
    if (current?.status !== "void") throw new BookError(409, "The entry changed before it could be voided. Please refresh and retry.");
  }
  const current = await db.prepare("SELECT * FROM bookkeeping_entries WHERE id = ?").bind(id).first();
  return json({ entry: entryView(current, actor.device), message: "Entry voided. It is excluded from totals and retained in the audit history." });
}

function csvCell(value) {
  let text = String(value ?? "");
  // Quoting alone does not prevent spreadsheet formula execution.
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportEntries(db, actor, url) {
  const access = await requireScope(db, url.searchParams.get("scope"), actor.device);
  const shared = access.key.startsWith("matching:") || access.key.startsWith("demo:");
  const [scopeType, scopeId] = access.key.split(":");
  const select = shared
    ? scopeType === "matching"
      ? `SELECT e.*, p.display_name AS team_owner_name, p.role AS team_owner_role FROM bookkeeping_entries e LEFT JOIN matching_profiles p ON p.user_id = e.owner_device WHERE e.scope_key = ? AND ${access.predicate} ORDER BY e.entry_date DESC, e.created_at DESC, e.id DESC LIMIT 5001`
      : `SELECT e.*, dm.display_name AS team_owner_name, dm.role AS team_owner_role FROM bookkeeping_entries e LEFT JOIN demo_members dm ON dm.device_id = e.owner_device AND dm.group_id = ? WHERE e.scope_key = ? AND ${access.predicate} ORDER BY e.entry_date DESC, e.created_at DESC, e.id DESC LIMIT 5001`
    : `SELECT * FROM bookkeeping_entries WHERE scope_key = ? AND ${access.predicate} ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 5001`;
  const parameters = scopeType === "demo" && shared ? [scopeId, access.key, ...access.parameters] : [access.key, ...access.parameters];
  const rows = await db.prepare(select).bind(...parameters).all();
  if ((rows.results || []).length > 5000) throw new BookError(413, "The 5,000-entry export limit was reached. No records were omitted or exported. Contact the site owner to arrange a larger export.");
  const records = [["Date", "Type", "Merchant", "Amount", "Currency", "Category", "Note", "Status", ...(shared ? ["Recorded by", "Role"] : []), "Receipt", "Created at", "Voided at"]];
  for (const row of rows.results || []) records.push([row.entry_date, row.kind, row.merchant, (Number(row.amount_minor) / 100).toFixed(2), row.currency, row.category, row.note, row.status, ...(shared ? [row.team_owner_name || "Team member", row.team_owner_role || ""] : []), row.receipt_name || "", new Date(Number(row.created_at)).toISOString(), row.voided_at ? new Date(Number(row.voided_at)).toISOString() : ""]);
  return new Response(`\uFEFF${records.map((record) => record.map(csvCell).join(",")).join("\r\n")}\r\n`, { headers: {
    "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="onlyskill-bookkeeping.csv"', "cache-control": "private, no-store", "x-content-type-options": "nosniff",
  } });
}

export async function handleBookkeepingRoute(request, env, url = new URL(request.url)) {
  try {
    if (!env.DB) throw new BookError(503, "The bookkeeping database is not available. Please retry later.");
    const actor = identity(request, url);
    if (url.pathname === "/api/books/session" && request.method === "POST") { await authenticate(env.DB, actor, true); return await session(env.DB, actor); }
    await authenticate(env.DB, actor);
    if (url.pathname === "/api/books/entries" && request.method === "POST") return await createEntry(request, env, actor);
    if (url.pathname === "/api/books/entries" && request.method === "GET") return await listEntries(env.DB, actor, url);
    if (url.pathname === "/api/books/export" && request.method === "GET") return await exportEntries(env.DB, actor, url);
    const receipt = url.pathname.match(/^\/api\/books\/entries\/([^/]+)\/receipt$/);
    if (receipt && request.method === "GET") { if (!UUID.test(receipt[1])) throw new BookError(400, "The entry identifier is invalid."); return await downloadReceipt(env, actor, receipt[1].toLowerCase()); }
    const cancellation = url.pathname.match(/^\/api\/books\/entries\/([^/]+)\/void$/);
    if (cancellation && request.method === "POST") { if (!UUID.test(cancellation[1])) throw new BookError(400, "The entry identifier is invalid."); return await voidEntry(request, env.DB, actor, cancellation[1].toLowerCase()); }
    return json({ error: "Bookkeeping endpoint or request method not found." }, 404);
  } catch (error) {
    if (error instanceof BookError) return json({ error: error.message }, error.status);
    return json({ error: "The bookkeeping service could not complete the request. Nothing has been confirmed unless it appears in your ledger. Please refresh and retry." }, 503);
  }
}
