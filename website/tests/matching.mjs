#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scoreTriple } from "../worker/matching.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationNames = (await readdir(resolve(root, "drizzle"))).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
const migrations = await Promise.all(migrationNames.map((name) => readFile(resolve(root, "drizzle", name), "utf8")));
const worker = await import(pathToFileURL(resolve(root, "worker/index.js")).href + "?matching-test=" + Date.now());

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
      async all() { return {results:sqlite.prepare(sql).all(...values)}; },
      async run() { const result = sqlite.prepare(sql).run(...values); return {meta:{changes:Number(result.changes)}}; },
      sql,
      values:() => values,
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
          const result = sqlite.prepare(statement.sql).run(...statement.values());
          return {meta:{changes:Number(result.changes)}};
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

async function call(db, path, method = "GET", body) {
  const request = new Request("https://onlyskill.test" + path, {
    method,
    headers:body ? {"content-type":"application/json"} : undefined,
    body:body ? JSON.stringify(body) : undefined,
  });
  const response = await worker.default.fetch(request, {DB:db});
  let data;
  try { data = await response.json(); } catch (_) { data = null; }
  return {response,data};
}

function profile(deviceId, role, suffix = "") {
  const roleSkills = {
    "Product Creator":["baking","recipe testing","product design"],
    Marketing:["marketing","social content","writing"],
    Sales:["sales","customer communication","orders"],
  };
  return {
    deviceId,
    displayName:role.split(" ")[0] + suffix,
    role,
    skills:roleSkills[role],
    interests:["food business","university students","small business"],
    businessGoal:"Sell homemade chili sauce to university students",
    availabilityHours:5,
    availabilitySlots:["weekday evenings","weekends"],
  };
}

async function submitProfile(db, data) {
  return call(db, "/api/matching/profile", "POST", data);
}

function assertPersonalPlan(state, role) {
  assert.equal(state.team.tasks.length, 3, "only the current phone's three task phases are returned");
  assert.equal(state.team.tasks.every((task) => task.role === role && task.canUpdate), true, "the backend returns only personally assigned tasks");
  const steps = state.team.tasks.flatMap((task) => task.steps);
  assert.equal(steps.length, 18, "each personal plan is broken into eighteen persisted microtasks");
  assert.equal(new Set(steps.map((step) => step.id)).size, 18);
  for (const task of state.team.tasks) {
    assert.equal(Object.hasOwn(task, "deviceId") || Object.hasOwn(task, "userId") || Object.hasOwn(task, "user_id"), false, "task state omits device identities");
    assert.equal(task.steps.length, 6);
    assert.equal(task.stepCount, 6);
    assert.equal(task.completedCount, task.steps.filter((step) => step.completed).length);
    assert.equal(task.completed, task.steps.every((step) => step.completed), "phase completion follows its real microtask progress");
    assert.equal(new Set(task.steps.map((step) => step.key)).size, 6);
    for (const step of task.steps) {
      for (const field of ["id", "key", "title", "detail", "output"]) assert.ok(typeof step[field] === "string" && step[field].trim(), `microtasks include useful ${field}`);
      assert.equal(typeof step.completed, "boolean");
      assert.ok(Number.isInteger(step.estimatedMinutes) && step.estimatedMinutes > 0, "time estimates are positive integer minutes");
      assert.equal(Object.hasOwn(step, "deviceId") || Object.hasOwn(step, "userId") || Object.hasOwn(step, "user_id"), false, "steps omit device identities");
    }
  }
}

async function activateTeam(db, deviceIds) {
  let result;
  for (let index = 0; index < roles.length; index++) result = await submitProfile(db, profile(deviceIds[index], roles[index]));
  const teamId = result.data.team.id;
  for (const deviceId of deviceIds) {
    result = await call(db, "/api/matching/decision", "POST", {deviceId,teamId,action:"accept"});
    assert.equal(result.response.status, 200);
  }
  assert.equal(result.data.team.status, "active");
  return result;
}

const roles = ["Product Creator","Marketing","Sales"];
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const profiles = roles.map((role, index) => profile(ids[index], role));
const score = scoreTriple(profiles);
assert.ok(score && score.score >= 0 && score.score <= 100, "valid one-per-role triples receive a score");
assert.equal(scoreTriple([profiles[0], profiles[1], {...profiles[2],role:"Marketing"}]), null, "invalid role composition is never scored");

const db = createD1();
let result = await call(db, "/api/matching/state?device=" + ids[0]);
assert.equal(result.response.status, 200);
assert.equal(result.data.profile, null);

for (let index = 0; index < 2; index++) {
  result = await submitProfile(db, profiles[index]);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.team, null);
}
result = await submitProfile(db, profiles[2]);
assert.equal(result.response.status, 200);
assert.equal(result.data.team.status, "forming");
assert.equal(result.data.team.members.length, 3);
assert.deepEqual(result.data.team.members.map((member) => member.role), roles);
assert.equal(result.data.team.members.some((member) => Object.hasOwn(member,"deviceId")), false, "team state does not expose other device identities");
assert.ok(result.data.team.matchScore >= 0 && result.data.team.matchScore <= 100);
assert.equal(result.data.team.members.every((member) => member.invitationStatus === "invited"), true);
assert.deepEqual(result.data.team.tasks, [], "forming teams do not receive active task plans");
assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS count FROM matching_task_steps").get().count, 0, "no microtasks are created before every member accepts");
const preActivationMessage = await call(db, "/api/matching/message", "POST", {deviceId:ids[0],message:"Opening before acceptance"});
assert.equal(preActivationMessage.response.status, 409, "the shared group opens only after all three members accept");

const duplicateReservation = await submitProfile(db, {...profiles[0],displayName:"Changed name"});
assert.equal(duplicateReservation.response.status, 409, "a reserved device cannot create another team/profile invitation");

for (const [index, deviceId] of ids.entries()) {
  result = await call(db, "/api/matching/decision", "POST", {deviceId,teamId:result.data.team.id,action:"accept"});
  assert.equal(result.response.status, 200);
  if (index < 2) {
    assert.equal(result.data.team.status, "forming");
    assert.deepEqual(result.data.team.tasks, [], "partially accepted teams still have no active task plan");
  }
}
const teamId = result.data.team.id;
assert.equal(result.data.team.status, "active", "team activates only after all three accept");
assert.equal(result.data.team.members.filter((member) => member.invitationStatus === "accepted").length, 3);
assertPersonalPlan(result.data, "Sales");
assert.equal(result.data.team.messages.length, 0, "a newly activated group chat starts empty");

const personalStates = [];
for (let index = 0; index < ids.length; index++) {
  const state = await call(db, "/api/matching/state?device=" + ids[index]);
  assert.equal(state.response.status, 200);
  assertPersonalPlan(state.data, roles[index]);
  personalStates.push(state.data);
}
for (let index = 0; index < ids.length; index++) {
  const serializedTasks = JSON.stringify(personalStates[index].team.tasks);
  for (let other = 0; other < ids.length; other++) {
    if (index === other) continue;
    for (const task of personalStates[other].team.tasks) {
      assert.equal(serializedTasks.includes(task.id), false, "other roles' task IDs are not sent to the browser");
      for (const step of task.steps) assert.equal(serializedTasks.includes(step.id), false, "other roles' microtask IDs are not sent to the browser");
    }
  }
}
assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS count FROM matching_task_steps").get().count, 54, "all three personal plans are saved without duplication");
const outsiderState = await call(db, "/api/matching/state?device=99999999-9999-4999-8999-999999999999");
assert.equal(outsiderState.data.team, null, "a non-member receives no team or task details");

const messageResult = await call(db, "/api/matching/message", "POST", {deviceId:ids[2],message:"Hello team!\nLet's get started."});
assert.equal(messageResult.response.status, 200);
assert.equal(messageResult.data.team.members.length, 3, "the group contains exactly the accepted three-person team");
assert.equal(messageResult.data.team.messages.length, 1);
assert.equal(messageResult.data.team.messages[0].body, "Hello team!\nLet's get started.");
assert.equal(messageResult.data.team.messages[0].name, profiles[2].displayName);
assert.equal(messageResult.data.team.messages[0].isMine, true);
assert.equal(Object.hasOwn(messageResult.data.team.messages[0],"userId"), false, "message responses do not expose device identities");
const teammateState = await call(db, "/api/matching/state?device=" + ids[0]);
assert.equal(teammateState.data.team.messages[0].isMine, false, "all accepted teammates share the same group messages");
const blankMessage = await call(db, "/api/matching/message", "POST", {deviceId:ids[0],message:"  \n "});
assert.equal(blankMessage.response.status, 400, "blank messages are rejected");
const longMessage = await call(db, "/api/matching/message", "POST", {deviceId:ids[0],message:"x".repeat(1001)});
assert.equal(longMessage.response.status, 400, "messages longer than 1,000 characters are rejected");
const nonMemberMessage = await call(db, "/api/matching/message", "POST", {deviceId:"99999999-9999-4999-8999-999999999999",message:"Not on this team"});
assert.equal(nonMemberMessage.response.status, 409, "a non-member cannot use the group");

const ownTask = personalStates[2].team.tasks[0];
const ownStep = ownTask.steps[0];
const stepResult = await call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:ownStep.id,completed:true});
assert.equal(stepResult.response.status, 200);
const partiallyCompleted = stepResult.data.team.tasks.find((task) => task.id === ownTask.id);
assert.equal(partiallyCompleted.steps[0].completed, true);
assert.equal(partiallyCompleted.completed, false, "checking one step does not complete the whole phase");
assert.equal(partiallyCompleted.completedCount, 1);
const refreshedSteps = await call(db, "/api/matching/state?device=" + ids[2]);
assert.equal(refreshedSteps.data.team.tasks.find((task) => task.id === ownTask.id).steps[0].completed, true, "microtask progress survives a new status request");
assert.deepEqual(refreshedSteps.data.team.tasks.find((task) => task.id === ownTask.id).steps.map((step) => step.id), ownTask.steps.map((step) => step.id), "refresh keeps the same ordered persisted steps");
let fullPhase;
for (const step of ownTask.steps.slice(1)) fullPhase = await call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:step.id,completed:true});
assert.equal(fullPhase.data.team.tasks.find((task) => task.id === ownTask.id).completed, true, "the phase completes only when all six steps are done");
const reopenedPhase = await call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:ownStep.id,completed:false});
assert.equal(reopenedPhase.data.team.tasks.find((task) => task.id === ownTask.id).completed, false);
assert.equal(reopenedPhase.data.team.tasks.find((task) => task.id === ownTask.id).completedCount, 5, "reopening one step preserves its five completed siblings");
const taskResult = await call(db, "/api/matching/task", "POST", {deviceId:ids[2],taskId:ownTask.id,completed:true});
assert.equal(taskResult.response.status, 200);
assert.equal(taskResult.data.team.tasks.find((task) => task.id === ownTask.id).completed, true);
assert.equal(taskResult.data.team.tasks.find((task) => task.id === ownTask.id).steps.every((step) => step.completed), true, "the retained legacy phase endpoint updates all its own children consistently");
const clearedPhase = await call(db, "/api/matching/task", "POST", {deviceId:ids[2],taskId:ownTask.id,completed:false});
assert.equal(clearedPhase.data.team.tasks.find((task) => task.id === ownTask.id).steps.every((step) => !step.completed), true);
const foreignTask = personalStates[0].team.tasks[0];
const deniedTask = await call(db, "/api/matching/task", "POST", {deviceId:ids[2],taskId:foreignTask.id,completed:true});
assert.equal(deniedTask.response.status, 409, "members can only update their own assigned tasks");
const deniedStep = await call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:foreignTask.steps[0].id,completed:true});
assert.equal(deniedStep.response.status, 409, "a teammate cannot modify another role's microtasks even with a known ID");
const creatorAfterDenial = await call(db, "/api/matching/state?device=" + ids[0]);
assert.equal(creatorAfterDenial.data.team.tasks.find((task) => task.id === foreignTask.id).steps[0].completed, false, "denied writes do not change the owner's progress");
const nonMemberStep = await call(db, "/api/matching/task-step", "POST", {deviceId:"99999999-9999-4999-8999-999999999999",stepId:ownStep.id,completed:true});
assert.equal(nonMemberStep.response.status, 409, "a non-member cannot update a known microtask");
const missingStep = await call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:crypto.randomUUID(),completed:true});
assert.equal(missingStep.response.status, 409, "an unknown step does not fabricate task data");
for (const body of [{deviceId:ids[2],stepId:ownStep.id,completed:"true"},{deviceId:ids[2],completed:true},{deviceId:"invalid",stepId:ownStep.id,completed:true}]) {
  const invalid = await call(db, "/api/matching/task-step", "POST", body);
  assert.equal(invalid.response.status, 400, "invalid identities, IDs, and non-boolean progress are rejected");
}
const parallelUpdates = await Promise.all(ownTask.steps.slice(0,2).map((step) => call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:step.id,completed:true})));
assert.equal(parallelUpdates.every((update) => update.response.status === 200), true);
const afterParallelUpdates = await call(db, "/api/matching/state?device=" + ids[2]);
assert.equal(afterParallelUpdates.data.team.tasks.find((task) => task.id === ownTask.id).completedCount, 2, "concurrent updates to independent steps preserve both values");

const cancel = await call(db, "/api/matching/cancel", "POST", {deviceId:ids[0],teamId});
assert.equal(cancel.response.status, 200);
assert.equal(cancel.data.team, null);
assert.equal(cancel.data.profile.matchOptIn, false, "cancelling pauses the initiating profile until it resubmits");
for (const deviceId of ids) {
  const state = await call(db, "/api/matching/state?device=" + deviceId);
  assert.equal(state.data.team, null, "cancelling an active team releases all members");
}
const cancelledGroupMessage = await call(db, "/api/matching/message", "POST", {deviceId:ids[1],message:"This group has ended"});
assert.equal(cancelledGroupMessage.response.status, 409, "a cancelled team can no longer send messages");
const cancelledStep = await call(db, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:ownStep.id,completed:false});
assert.equal(cancelledStep.response.status, 409, "a cancelled team cannot mutate stored microtasks");
const cancelledPhase = await call(db, "/api/matching/task", "POST", {deviceId:ids[2],taskId:ownTask.id,completed:false});
assert.equal(cancelledPhase.response.status, 409, "the retained legacy phase endpoint also rejects cancelled teams");
assert.equal(db.sqlite.prepare("SELECT completed FROM matching_task_steps WHERE id = ?").get(ownStep.id).completed, 1, "cancellation retains the historical task data unchanged");

const backfillDb = createD1();
await activateTeam(backfillDb, ids);
for (const deviceId of ids) await call(backfillDb, "/api/matching/state?device=" + deviceId);
backfillDb.sqlite.prepare("UPDATE matching_tasks SET completed = CASE WHEN user_id = ? THEN 1 WHEN user_id = ? AND task_key = 'sample' THEN 1 ELSE 0 END").run(ids[1],ids[0]);
backfillDb.sqlite.exec("DELETE FROM matching_task_steps");
const upgradedStates = await Promise.all([...ids,ids[2]].map((deviceId) => call(backfillDb, "/api/matching/state?device=" + deviceId)));
for (let index = 0; index < ids.length; index++) {
  assert.equal(upgradedStates[index].response.status, 200);
  assertPersonalPlan(upgradedStates[index].data, roles[index]);
}
assert.equal(upgradedStates[1].data.team.tasks.every((task) => task.completed && task.steps.every((step) => step.completed)), true, "upgrading a completed legacy Marketing plan keeps every phase and new microtask complete");
assert.equal(upgradedStates[0].data.team.tasks.find((task) => task.key === "sample").steps.every((step) => step.completed), true, "a completed legacy Creator phase is preserved independently");
assert.equal(upgradedStates[0].data.team.tasks.filter((task) => task.key !== "sample").every((task) => task.steps.every((step) => !step.completed)), true);
assert.deepEqual(upgradedStates[3].data.team.tasks, upgradedStates[2].data.team.tasks, "concurrent first reads of the same plan converge on one set of persisted steps");
const upgradedSalesStep = upgradedStates[2].data.team.tasks[0].steps[0];
await call(backfillDb, "/api/matching/task-step", "POST", {deviceId:ids[2],stepId:upgradedSalesStep.id,completed:true});
const beforeBackfillRepeat = backfillDb.sqlite.prepare("SELECT id,completed FROM matching_task_steps ORDER BY id").all();
for (const deviceId of ids) await call(backfillDb, "/api/matching/state?device=" + deviceId);
assert.deepEqual(backfillDb.sqlite.prepare("SELECT id,completed FROM matching_task_steps ORDER BY id").all(), beforeBackfillRepeat, "idempotent backfill preserves IDs, legacy completion, and newly recorded microtask progress");
assert.equal(beforeBackfillRepeat.length, 54);

const rejectionDb = createD1();
const rejectionIds = [
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
];
let proposed;
for (let index = 0; index < roles.length; index++) proposed = await submitProfile(rejectionDb, profile(rejectionIds[index], roles[index]));
assert.equal(proposed.data.team.status, "forming");
const rejected = await call(rejectionDb, "/api/matching/decision", "POST", {deviceId:rejectionIds[1],teamId:proposed.data.team.id,action:"reject"});
assert.equal(rejected.response.status, 200);
assert.equal(rejected.data.team, null);
assert.equal(rejected.data.profile.matchOptIn, false);
for (const deviceId of [rejectionIds[0],rejectionIds[2]]) {
  const state = await call(rejectionDb, "/api/matching/state?device=" + deviceId);
  assert.equal(state.data.team, null, "rejection releases the other invitees");
  assert.equal(state.data.profile.matchOptIn, true);
}

const guardDb = createD1();
const guardProfiles = [
  ["77777777-7777-4777-8777-777777777777","Product Creator"],
  ["88888888-8888-4888-8888-888888888888","Product Creator"],
];
for (const [deviceId, role] of guardProfiles) guardDb.sqlite.prepare("INSERT INTO matching_profiles (user_id,role,display_name,skills,interests,business_goal,availability_hours,availability_slots,match_opt_in,created_at,updated_at) VALUES (?, ?, ?, '[]', '[]', 'test goal', 5, '[]', 1, 1, 1)").run(deviceId,role,role);
guardDb.sqlite.prepare("INSERT INTO matching_teams (id,status,match_score,score_breakdown,created_at,updated_at) VALUES ('guard-team','forming',50,'{}',1,1)").run();
assert.throws(() => guardDb.sqlite.prepare("UPDATE matching_teams SET status='active' WHERE id='guard-team'").run(), /CHECK constraint failed/,
  "database check prevents partial teams from being activated");
guardDb.sqlite.prepare("INSERT INTO matching_teams (id,status,match_score,score_breakdown,created_at,updated_at) VALUES ('guard-team-2','forming',50,'{}',1,1)").run();
guardDb.sqlite.prepare("INSERT INTO matching_team_members (id,team_id,user_id,role,status,invited_at) VALUES ('guard-member-1','guard-team',?,'Product Creator','invited',1)").run(guardProfiles[0][0]);
assert.throws(() => guardDb.sqlite.prepare("INSERT INTO matching_team_members (id,team_id,user_id,role,status,invited_at) VALUES ('guard-member-2','guard-team',?,'Product Creator','invited',1)").run(guardProfiles[1][0]), /UNIQUE constraint/,
  "a forming team cannot reserve two users for the same role");
assert.throws(() => guardDb.sqlite.prepare("INSERT INTO matching_team_members (id,team_id,user_id,role,status,invited_at) VALUES ('guard-member-3','guard-team-2',?,'Product Creator','invited',1)").run(guardProfiles[0][0]), /UNIQUE constraint/,
  "a device cannot be reserved by two pending teams");

const legacyDb = createD1();
const legacyIds = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
];
const legacyJoinBodies = [
  {deviceId:legacyIds[0],displayName:"Creator",role:"Product Creator",productName:"Chili sauce"},
  {deviceId:legacyIds[1],displayName:"Marketer",role:"Marketing"},
  {deviceId:legacyIds[2],displayName:"Seller",role:"Sales"},
];
let legacyState;
for (const body of legacyJoinBodies) legacyState = await call(legacyDb, "/api/join", "POST", body);
assert.equal(legacyState.response.status, 200);
assert.equal(legacyState.data.matched, true, "the original three-phone Team-up still forms automatically");
assert.equal(legacyState.data.members.length, 3);
assert.equal(legacyState.data.messages.length, 0, "its shared group opens with an empty chat");
const legacyMessage = await call(legacyDb, "/api/group/message", "POST", {deviceId:legacyIds[1],message:"Hello from the team"});
assert.equal(legacyMessage.response.status, 200, "Team-up members can message their active group");
assert.equal(legacyMessage.data.messages[0].body, "Hello from the team");
const legacyTeammate = await call(legacyDb, "/api/state?device=" + legacyIds[2]);
assert.equal(legacyTeammate.data.messages[0].isMine, false, "the other Team-up phones receive shared messages");
const legacyVisitor = await call(legacyDb, "/api/state?device=dddddddd-dddd-4ddd-8ddd-dddddddddddd");
assert.deepEqual(legacyVisitor.data.messages, [], "non-member Team-up sessions cannot read the group chat");
const legacyOutsider = await call(legacyDb, "/api/group/message", "POST", {deviceId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",message:"Not on this team"});
assert.equal(legacyOutsider.response.status, 409, "non-member Team-up sessions cannot post to the group chat");
legacyDb.sqlite.prepare("UPDATE demo_members SET joined_at = ?").run(Date.now() - 5 * 60 * 60 * 1000);
const expiredLegacyState = await call(legacyDb, "/api/state?device=" + legacyIds[0]);
assert.equal(expiredLegacyState.data.count, 0);
assert.equal(legacyDb.sqlite.prepare("SELECT COUNT(*) AS count FROM demo_group_messages").get().count, 0, "the legacy chat expires with its team");

for (const database of [db,backfillDb,rejectionDb,guardDb,legacyDb]) database.sqlite.close();
console.log("OnlySkill matching, personal microtask privacy, persistence, phase progress, legacy backfill, team lifecycle, and strict constraint checks passed.");
