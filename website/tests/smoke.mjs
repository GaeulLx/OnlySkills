#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { lookupWorkBuddyResults } from "../worker/workbuddy-results.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "worker/index.js"), "utf8");
const manifest = JSON.parse(await readFile(resolve(root, ".openai/hosting.json"), "utf8"));
assert.equal(manifest.project_id, "appgprj_6aca8e5947608191b83d8764f3c588fd", "the independent deployment keeps its own Site identity");
assert.equal(manifest.d1, "DB");
assert.equal(manifest.static, undefined);
assert.doesNotMatch(source, /Aisha K\.|Amir H\.|Priya N\./);
assert.doesNotMatch(source, /Daniel Wong|Leo Chen|Aisha Rahman|Maya Tan|Noor Idris/, "reference screenshot names are not copied into real matching UI");
assert.match(source, /#cursor-glow\{position:fixed/);
assert.match(source, /window\.addEventListener\("pointermove"/);

const worker = await import(pathToFileURL(resolve(root, "worker/index.js")).href + "?smoke=" + Date.now());
const rows = [];
const messages = [];
const db = {
  prepare(sql) {
    let values = [];
    const statement = {
      bind(...args) { values = args; return statement; },
      async first() {
        if (sql.startsWith("SELECT MAX")) return { latest: rows.length ? Math.max(...rows.map((row) => row.joined_at)) : null };
        if (sql.startsWith("SELECT group_id FROM demo_members")) return rows.find((row) => row.group_id)?.group_id ? { group_id: rows.find((row) => row.group_id).group_id } : null;
        if (sql.includes("WHERE device_id = ?")) return rows.find((row) => row.device_id === values[0]) || null;
        if (sql.includes("WHERE role = ?")) return rows.find((row) => row.role === values[0]) || null;
        throw new Error("Unexpected first query: " + sql);
      },
      async all() {
        if (sql.startsWith("SELECT role, device_id")) return { results: [...rows].sort((a, b) => a.role.localeCompare(b.role)) };
        if (sql.includes("FROM demo_group_messages m JOIN demo_members")) return { results: messages.filter((message) => message.group_id === values[0]).sort((a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id)).slice(0, 100).map((message) => ({ ...message, display_name: rows.find((row) => row.device_id === message.device_id)?.display_name })) };
        throw new Error("Unexpected all query: " + sql);
      },
      async run() {
        if (sql.startsWith("DELETE FROM demo_group_messages")) {
          const groupIds = new Set(rows.map((row) => row.group_id));
          const oldCount = messages.length;
          for (let index = messages.length - 1; index >= 0; index--) if (groupIds.has(messages[index].group_id)) messages.splice(index, 1);
          return { meta: { changes: oldCount - messages.length } };
        }
        if (sql.startsWith("DELETE")) { rows.splice(0); return { meta: { changes: 1 } }; }
        if (sql.startsWith("UPDATE demo_members SET group_id")) {
          const [group_id] = values;
          let changes = 0;
          for (const row of rows) if (!row.group_id) { row.group_id = group_id; changes++; }
          return { meta: { changes } };
        }
        if (sql.trimStart().startsWith("INSERT INTO demo_group_messages")) {
          const [id, body, created_at, device_id] = values;
          const member = rows.find((row) => row.device_id === device_id);
          const groupMembers = member ? rows.filter((row) => row.group_id === member.group_id) : [];
          if (!member || groupMembers.length !== 3 || !["Product Creator", "Marketing", "Sales"].every((role) => groupMembers.some((row) => row.role === role)) || !groupMembers.some((row) => row.role === "Product Creator" && row.product_name)) return { meta: { changes: 0 } };
          messages.push({ id, group_id: member.group_id, device_id, body, created_at });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT INTO demo_members")) {
          const [role, device_id, display_name, product_name, joined_at, group_id] = values;
          if (rows.some((row) => row.role === role || row.device_id === device_id)) throw new Error("unique constraint");
          rows.push({ role, device_id, display_name, product_name, joined_at, group_id });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE demo_members SET role")) {
          const [role, display_name, product_name, joined_at, group_id, device_id] = values;
          const row = rows.find((entry) => entry.device_id === device_id);
          if (!row || rows.some((entry) => entry.role === role && entry.device_id !== device_id)) throw new Error("unique constraint");
          Object.assign(row, { role, display_name, product_name, joined_at, group_id });
          return { meta: { changes: 1 } };
        }
        throw new Error("Unexpected run query: " + sql);
      },
    };
    return statement;
  },
};

async function call(path, method = "GET", body) {
  const request = new Request("https://onlyskill.test" + path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const response = await worker.default.fetch(request, { DB: db });
  return { response, data: await response.json() };
}

const page = await worker.default.fetch(new Request("https://onlyskill.test/"), { DB: db });
const html = await page.text();
assert.equal(page.status, 200);
assert.doesNotMatch(html, /Start a new demo|restart the demo|\/api\/reset/);
assert.doesNotMatch(html, /id="(?:tab-team|team-page|join-form)"/, "the old Team-up screen has been removed without deleting its backend data");
assert.match(html.match(/<button\b[^>]*id="nav-profile"[^>]*>/)?.[0] || "", /aria-current="page"/, "the profile/avatar entry is the first workspace page");
assert.doesNotMatch(html.match(/<section\b[^>]*id="profile-page"[^>]*>/)?.[0] || "", /\bhidden\b/, "new visitors land on profile setup first");
assert.match(html.match(/<section\b[^>]*id="matching-page"[^>]*>/)?.[0] || "", /\bhidden\b/, "Teammates is not the initial page");
assert.match(html.match(/<button\b[^>]*id="nav-profile"[^>]*>/)?.[0] || "", /aria-controls="profile-page"/, "the profile avatar opens its own page");
assert.match(html, /id="matching-form" class="card matching-form profile-form-card"/, "the existing matching form is reused on the profile page");
assert.match(html, /selectAppTab\(currentMatchingState\?\.profile \? "matching" : "profile"\)/, "returning users go to matching while new devices start with profile setup");
assert.match(html, /if \(isFirstProfile && currentMatchingState\?\.profile\)[\s\S]*?selectAppTab\("agent", "tab-agent", "profile-next-step"\)/, "saving a first profile directs the user into AI Workspace");
assert.match(html, /id="profile-next-step-cta"[^>]*>Continue to Teammates/, "AI Workspace provides the next step into teammate matching");
assert.match(html, /Goal workflow/);
assert.match(html, /View WorkBuddy results/);
assert.match(html, /id="matching-constellation-panel"/, "Matching includes the restored venture constellation view");
assert.match(html, /id="matching-constellation" class="constellation-map"/, "the constellation has a live data-rendering host");
assert.match(html, /function renderMatchingConstellation\(state\)/, "the map is rendered from current matching state");
assert.match(html, /Potential profiles only; no teammate is named until a match is formed\./, "unmatched positions never invent teammate cards");
assert.match(html, /id="workbuddy-lookup-form"/);
assert.match(html, /\/api\/results\?runId=/);
assert.match(html, /lookupWorkBuddyResults\(runId, requestAgentJSON, apiURL\)/);
assert.match(html, /No WorkBuddy run was found for that run ID/);
assert.doesNotMatch(html, /__WORKBUDDY_LOOKUP_FUNCTION__/);
assert.doesNotMatch(html, /Authorization:\s*["']Bearer\s/);
assert.match(html, /Matching/);
assert.match(html, /A SPACE FOR POSSIBILITY/);
assert.match(html, /workspace-sidebar/);
assert.match(html, /workspace-topbar/);
assert.match(html, /id="tab-overview"[^>]*aria-controls="overview-page"/);
assert.match(html, /data-workspace-destination="plan"/);
assert.match(html, /data-workspace-destination="agent-team"/);
assert.doesNotMatch(html, /nav-deliverables/, "the removed Deliverables navigation entry is not rendered or used as a navigation target");
assert.match(html, /destination === "deliverables"\) return selectAppTab\("agent", sourceId \|\| "tab-agent", "workbuddy-lookup-form"\)/, "Overview's existing results shortcut still opens lookup in AI Workspace");
assert.match(html, /id="workbuddy-lookup-form"/, "existing results lookup remains available within AI Workspace");
assert.match(html, /function renderOverview\(\)/);
assert.match(html, /matchEnded \? "Match ended"/);
assert.match(html, /team\.tasks\) \? team\.tasks : \[\]\)\.filter\(task => task\.canUpdate && task\.role === profile\?\.role\)/, "Overview only summarizes tasks assigned to the current role");
assert.match(html, /--nav-bg:#ebe5dc;--page:#f4f1eb;--paper:#fffdf8/);
assert.match(html, /--brand:#bc3e2b/);
assert.doesNotMatch(html, /Views this week|Orders fulfilled|Conversion rate|Aisha K\.|Amir H\.|Priya N\./, "WorkBuddy's fictional profiles and KPI cards are not imported");
for (const role of ["Product Creator", "Marketing", "Sales"]) assert.ok(html.includes('type="radio" name="role" value="' + role + '"'), `matching position selection includes ${role}`);
assert.match(html, /function navigateWorkspace\(destination, sourceId = ""\)/, "WorkBuddy navigation concepts map into existing features");
assert.match(html, /Bookkeeping/, "the existing receipt and bookkeeping feature is preserved");
assert.match(html, /id="books-scope-display"[^>]*>Loading shared team books/);
assert.match(html, /id="books-scope" type="hidden"/, "bookkeeping scope is fixed internally, not selectable by the user");
assert.doesNotMatch(html, /My bookkeeping|private bookkeeping|value="personal"/i, "only shared team books are offered in the bookkeeping UI");
assert.match(html, /Your 3-person group/);
assert.match(html, /\/api\/matching\/task-step/);
assert.match(html, /\/api\/matching\/message/);
assert.match(html, /const AGENT_API_BASE_URL = "https:\/\/onlyskills\.onrender\.com"/);
for (const endpoint of ["/api/health", "/api/chat", "response.statusUrl", "/api/approve"]) assert.ok(html.includes(endpoint), `agent workflow calls ${endpoint}`);
for (const agent of ["businessAnalyst", "growth", "teamBuilder", "operations", "feedback"]) assert.ok(html.includes(agent), `agent workflow renders ${agent}`);
assert.match(html, /FRONTEND_ORIGIN=/);
const clientScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(clientScript, "page includes its client logic");
new vm.Script(clientScript);

const validRunResponse = {
  runId: "workbuddy-valid-smoke-run",
  goal: "Smoke-test an existing WorkBuddy run",
  businessAnalyst: { status: "completed", summary: "Returned business analysis" },
  growth: { status: "completed", summary: "Returned growth result" },
  teamBuilder: { status: "completed", summary: "Returned team result" },
  operations: { status: "completed", summary: "Returned operations result" },
  feedback: { status: "completed", summary: "Returned feedback" },
  recommendation: { actionId: "smoke-action", text: "Returned recommendation" },
  artifacts: [{ title: "Smoke artifact", location: "reports/smoke.txt" }],
  validationStatus: "passed",
};
let validLookupUrl = "";
const lookedUpRun = await lookupWorkBuddyResults("workbuddy-valid-smoke-run", async (url, options = {}) => {
  validLookupUrl = url;
  assert.equal(options.method, undefined, "WorkBuddy lookup uses the default GET request");
  return validRunResponse;
}, (path) => new URL(path, "https://onlyskills.onrender.com").href);
assert.equal(validLookupUrl, "https://onlyskills.onrender.com/api/results?runId=workbuddy-valid-smoke-run");
assert.deepEqual(lookedUpRun, validRunResponse, "a valid run ID returns the actual API payload unchanged");
let emptyLookupRequests = 0;
await assert.rejects(() => lookupWorkBuddyResults("  ", async () => { emptyLookupRequests++; }, (path) => path), /Enter a run ID/);
assert.equal(emptyLookupRequests, 0, "a missing run ID is rejected without making a request");
await assert.rejects(() => lookupWorkBuddyResults("unknown-smoke-run", async (url) => {
  assert.match(url, /\/api\/results\?runId=unknown-smoke-run$/);
  throw Object.assign(new Error("Backend returned HTTP 404"), {status:404});
}, (path) => new URL(path, "https://onlyskills.onrender.com").href), /No WorkBuddy run was found/);

const configuredPage = await worker.default.fetch(new Request("https://onlyskill.test/"), { DB: db, ONLYSKILLS_API_BASE_URL: "https://staging-api.example.test/path" });
const configuredHtml = await configuredPage.text();
assert.match(configuredHtml, /const AGENT_API_BASE_URL = "https:\/\/staging-api\.example\.test"/);
const localOverridePage = await worker.default.fetch(new Request("https://onlyskill.test/"), { DB: db, ONLYSKILLS_API_BASE_URL: "http://localhost:3000" });
assert.match(await localOverridePage.text(), /const AGENT_API_BASE_URL = "https:\/\/onlyskills\.onrender\.com"/);

const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
let result = await call("/api/state?device=" + ids[0]);
assert.equal(result.data.count, 0);

result = await call("/api/join", "POST", { deviceId: ids[0], displayName: "Amina", role: "Product Creator", productName: "Campus Chili Sauce" });
assert.equal(result.response.status, 200);
assert.equal(result.data.matched, false);
assert.equal(result.data.yourRole, "Product Creator");

result = await call("/api/join", "POST", { deviceId: ids[1], displayName: "Ravi", role: "Marketing" });
assert.equal(result.data.count, 2);

result = await call("/api/join", "POST", { deviceId: ids[2], displayName: "Mei", role: "Sales" });
assert.equal(result.data.count, 3);
assert.equal(result.data.matched, true);
assert.equal(result.data.productName, "Campus Chili Sauce");
assert.equal(result.data.messages.length, 0, "the Team-up group opens automatically with an empty chat");
for (const row of rows) row.group_id = "";
result = await call("/api/state?device=" + ids[0]);
assert.ok(rows.every((row) => row.group_id), "an existing team receives a group id when upgraded");
assert.equal(new Set(rows.map((row) => row.group_id)).size, 1, "all three Team-up members share one group id");

const groupMessage = await call("/api/group/message", "POST", { deviceId: ids[1], message: "Hello from Marketing!" });
assert.equal(groupMessage.response.status, 200);
assert.equal(groupMessage.data.matched, true);
assert.equal(groupMessage.data.messages.length, 1);
assert.equal(groupMessage.data.messages[0].body, "Hello from Marketing!");
assert.equal(groupMessage.data.messages[0].name, "Ravi");
assert.equal(groupMessage.data.messages[0].isMine, true);
assert.equal(Object.hasOwn(groupMessage.data.messages[0], "deviceId"), false);
const teammateView = await call("/api/state?device=" + ids[2]);
assert.equal(teammateView.data.messages[0].isMine, false, "all three Team-up phones see the shared group message");
const visitorView = await call("/api/state?device=99999999-9999-4999-8999-999999999999");
assert.deepEqual(visitorView.data.messages, [], "a non-member cannot read the private group chat");
const visitorPost = await call("/api/group/message", "POST", { deviceId: "99999999-9999-4999-8999-999999999999", message: "Outside message" });
assert.equal(visitorPost.response.status, 409, "a non-member cannot send to the group");
const blankPost = await call("/api/group/message", "POST", { deviceId: ids[0], message: " \n " });
assert.equal(blankPost.response.status, 400);
const longPost = await call("/api/group/message", "POST", { deviceId: ids[0], message: "x".repeat(1001) });
assert.equal(longPost.response.status, 400);

const conflict = await call("/api/join", "POST", { deviceId: "44444444-4444-4444-8444-444444444444", displayName: "Sam", role: "Sales" });
assert.equal(conflict.response.status, 409);

const reset = await call("/api/reset", "POST", {});
assert.equal(reset.response.status, 404, "there is no manual reset endpoint");
result = await call("/api/state?device=" + ids[0]);
assert.equal(result.data.count, 3, "the completed team remains in the shared pool");
assert.equal(result.data.matched, true);

for (const row of rows) row.joined_at = Date.now() - 5 * 60 * 60 * 1000;
result = await call("/api/state?device=" + ids[0]);
assert.equal(result.data.count, 0, "idle demo data expires");
assert.equal(messages.length, 0, "group messages expire with their team");

console.log("OnlySkills shared-team API, goal-workflow shell, and WorkBuddy results lookup smoke checks passed.");
