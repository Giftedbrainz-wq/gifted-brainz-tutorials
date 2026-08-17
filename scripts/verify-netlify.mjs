// Fails the Netlify build early if the function entrypoints/config are missing.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "netlify.toml",
  "package.json",
  "netlify/functions/api.js",
  "netlify/functions/api-core.mjs",
  "netlify/functions/ping.js",
  "netlify/functions/ping-core.mjs",
  "public/index.html",
  "public/login.html",
  "public/api.js"
];

const missing = required.filter(p => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error("Gifted Brainz deploy check failed. Missing:");
  for (const p of missing) console.error(" - " + p);
  process.exit(1);
}

const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
if (!/publish\s*=\s*"public"/.test(toml) || !/functions\s*=\s*"netlify\/functions"/.test(toml)) {
  console.error("Gifted Brainz deploy check failed: netlify.toml must publish public/ and use netlify/functions/.");
  process.exit(1);
}

console.log("Gifted Brainz Netlify deploy check passed: static site + serverless function entrypoints are present.");
