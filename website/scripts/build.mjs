import { copyFile, cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "dist");
if (dirname(outputRoot) !== projectRoot || basename(outputRoot) !== "dist") throw new Error("Unexpected build output path.");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(resolve(outputRoot, "server"), { recursive: true });
await mkdir(resolve(outputRoot, ".openai"), { recursive: true });
await cp(resolve(projectRoot, "worker"), resolve(outputRoot, "server"), { recursive: true });
// Worker ESM hosting has no standalone static directory. Bundle pinned installed
// browser assets as strings served by the Worker, keeping runtime filesystem-free.
const assetPaths = {
  "/assets/tesseract-7.0.0.js": ["node_modules/tesseract.js/dist/tesseract.min.js", "text/javascript; charset=utf-8"],
  "/assets/tesseract-worker-7.0.0.js": ["node_modules/tesseract.js/dist/worker.min.js", "text/javascript; charset=utf-8"],
  "/assets/pdfjs-5.5.207.mjs": ["node_modules/pdfjs-dist/build/pdf.min.mjs", "text/javascript; charset=utf-8"],
  "/assets/pdfjs-worker-5.5.207.mjs": ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "text/javascript; charset=utf-8"],
};
const assets = {};
for (const [url, [path, contentType]] of Object.entries(assetPaths)) {
  assets[url] = { body: await readFile(resolve(projectRoot, path), "utf8"), contentType };
}
const licensePaths = ["THIRD_PARTY_NOTICES.md", "node_modules/tesseract.js/LICENSE.md", "node_modules/tesseract.js/dist/tesseract.min.js.LICENSE.txt", "node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt", "node_modules/pdfjs-dist/LICENSE"];
assets["/assets/bookkeeping-licenses.txt"] = {body:(await Promise.all(licensePaths.map(async path => path + "\n\n" + await readFile(resolve(projectRoot, path), "utf8")))).join("\n\n"),contentType:"text/plain; charset=utf-8"};
await writeFile(resolve(outputRoot, "server/books-vendor.js"), `const assets = ${JSON.stringify(assets)};\nexport function serveBooksVendor(path, method = 'GET') {\nconst asset = assets[path];\nif (!asset || !['GET','HEAD'].includes(method)) return null;\nreturn new Response(method === 'HEAD' ? null : asset.body, {headers:{'content-type':asset.contentType,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'}});\n}\n`);
await copyFile(resolve(projectRoot, ".openai/hosting.json"), resolve(outputRoot, ".openai/hosting.json"));
await cp(resolve(projectRoot, "drizzle"), resolve(outputRoot, ".openai/drizzle"), { recursive: true });
console.log("Built the OnlySkills Worker with pinned receipt OCR/PDF assets.");
