import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(root, "dist/server/index.js");
const manifestPath = resolve(root, "dist/.openai/hosting.json");
const migrationRoot = resolve(root, "dist/.openai/drizzle");
const [source, manifestText] = await Promise.all([readFile(workerPath, "utf8"), readFile(manifestPath, "utf8")]);
const manifest = JSON.parse(manifestText);
assert.equal(manifest.d1, "DB");
assert.equal(manifest.r2, "BUCKET");
assert.equal(manifest.static, undefined);
const migrations = (await readdir(migrationRoot)).filter((name) => name.endsWith(".sql"));
assert.ok(migrations.length > 0, "database migrations are included in the deployment artifact");
assert.match(await readFile(resolve(migrationRoot, migrations[0]), "utf8"), /CREATE TABLE.*demo_members/i);
const migrationTexts = await Promise.all(migrations.map((name) => readFile(resolve(migrationRoot, name), "utf8")));
assert.ok(migrationTexts.some((text) => /matching_profiles/i.test(text)), "matching profile migration is included in the deployment artifact");
assert.ok(migrationTexts.some((text) => /matching_teams_active_guard_check/i.test(text)), "team activation check is included in the deployment artifact");
assert.ok(migrationTexts.some((text) => /CREATE TABLE\s+`matching_messages`/i.test(text)), "persistent team group messages are included in the deployment artifact");
assert.ok(migrationTexts.some((text) => /CREATE TABLE\s+`demo_group_messages`/i.test(text)), "the original three-phone Team-up group chat is included in the deployment artifact");
assert.ok(migrationTexts.some((text) => /CREATE TABLE\s+`bookkeeping_entries`/i.test(text)), "bookkeeping migration is included");

const worker = await import(pathToFileURL(workerPath).href + "?validation=" + Date.now());
assert.equal(typeof worker.default?.fetch, "function", `${pathToFileURL(workerPath)} must export default.fetch`);
assert.match(source, /\/api\/state/);
assert.match(source, /\/api\/join/);
assert.match(source, /\/api\/matching\//);
assert.match(source, /\/api\/matching\/message/);
assert.match(source, /\/api\/group\/message/);
assert.match(source, /\/api\/books\//);
for (const path of ["/assets/tesseract-7.0.0.js", "/assets/tesseract-worker-7.0.0.js", "/assets/pdfjs-5.5.207.mjs", "/assets/pdfjs-worker-5.5.207.mjs", "/assets/bookkeeping-licenses.txt"]) {
  const asset = await worker.default.fetch(new Request("https://onlyskill.test" + path), {});
  assert.equal(asset.status, 200, `${path} is served without database or filesystem access`);
  assert.ok((await asset.text()).length > 100);
}
assert.doesNotMatch(source, /\/api\/reset/);
assert.match(source, /Product Creator[\s\S]*Marketing[\s\S]*Sales/);
console.log("OnlySkills Worker artifact is valid and declares its shared D1 database.");
