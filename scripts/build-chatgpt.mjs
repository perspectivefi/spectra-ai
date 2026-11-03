#!/usr/bin/env node
// Builds the ChatGPT plugin directory package, dist/spectra-chatgpt-v<version>.zip:
// chatgpt/plugin.json, chatgpt/mcp.json and chatgpt/README.md at the root, the
// spectra-yields skill and the icon. ChatGPT gets the read-only server only, because
// OpenAI's guidelines bar executing trades. `--check` validates without building.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const source = join(root, "chatgpt");
const SKILLS = ["spectra-yields"];
const READ_ONLY_URL = "https://mcp.spectra.finance/mcp";
const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const manifest = readJson(join(source, "plugin.json"));
const mcp = readJson(join(source, "mcp.json"));
const openai = manifest.extensions?.["com.openai"] ?? {};
const ui = openai.interface ?? {};
const review = openai.review ?? {};

// Listing rules from the OpenAI plugin submission guide.
for (const [key, max] of [["displayName", 30], ["shortDescription", 30], ["longDescription", 4000], ["developerName", 80]]) {
  if (!ui[key]) fail(`interface.${key} is required`);
  else if (ui[key].length > max) fail(`interface.${key} has ${ui[key].length} characters (max ${max})`);
}
for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  if (!/^https:\/\//.test(ui[key] ?? "") || ui[key].length > 1024) fail(`interface.${key} must be an https URL`);
}
if (!ui.category) fail("interface.category is required");
for (const key of ["logo", "composerIcon"]) {
  if (!ui[key]?.startsWith("./assets/")) fail(`interface.${key} must be a ./assets/ path`);
}
if (openai.apps || openai.hooks) fail("packages with apps or hooks can't be submitted");

// The directory needs at least 2:1 contrast between brandColor and white.
const luminance = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
if (!/^#[0-9A-Fa-f]{6}$/.test(ui.brandColor ?? "")) fail("interface.brandColor must be a #RRGGBB color");
else if (1.05 / (luminance(ui.brandColor) + 0.05) < 2) fail(`interface.brandColor ${ui.brandColor} has less than 2:1 contrast with white`);

// One server: the read-only endpoint, with no headers.
const servers = Object.entries(mcp.mcpServers ?? {});
if (servers.length !== 1) fail("mcp.json must declare exactly one server");
for (const [name, server] of servers) {
  if (server.type !== "streamable-http" || server.url !== READ_ONLY_URL) {
    fail(`mcp.json server "${name}" must be streamable-http at ${READ_ONLY_URL}`);
  }
  if (Object.keys(server.headers ?? {}).length) fail(`mcp.json server "${name}" must not send headers`);
}

// Review materials and version parity with the other plugin manifests.
const positive = review.test_cases?.positive ?? [];
const negative = review.test_cases?.negative ?? [];
if (positive.length < 5) fail(`review needs 5 positive test cases (has ${positive.length})`);
if (negative.length < 3) fail(`review needs 3 negative test cases (has ${negative.length})`);
if (!/^https:\/\//.test(review.demo_recording_url ?? "")) warnings.push("review.demo_recording_url is empty; the submission needs it");
const pluginVersion = readJson(join(root, "plugins/spectra/.claude-plugin/plugin.json")).version;
if (manifest.version !== pluginVersion) fail(`chatgpt/plugin.json version ${manifest.version} differs from the plugin's ${pluginVersion}`);
for (const skill of SKILLS) {
  if (!existsSync(join(root, "plugins/spectra/skills", skill, "SKILL.md"))) fail(`skill ${skill} not found`);
}

function report() {
  for (const error of errors) console.error(`✗ ${error}`);
  for (const warning of warnings.splice(0)) console.warn(`! ${warning}`);
  if (errors.length) process.exit(1);
}
report();
if (process.argv.includes("--check")) {
  console.log("✓ ChatGPT package manifests are valid");
  process.exit(0);
}

const name = `spectra-chatgpt-v${manifest.version}`;
const out = join(root, "dist", name);
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });
for (const file of ["plugin.json", "mcp.json", "README.md"]) cpSync(join(source, file), join(out, file));
for (const skill of SKILLS) {
  cpSync(join(root, "plugins/spectra/skills", skill), join(out, "skills", skill), { recursive: true });
}
for (const target of new Set([ui.logo, ui.composerIcon])) {
  cpSync(join(root, "plugins/spectra/.claude-plugin/icon.png"), join(out, target));
}

// Relative links in the packaged Markdown must resolve inside the package.
const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
for (const file of walk(out).filter((path) => path.endsWith(".md"))) {
  for (const [, target] of readFileSync(file, "utf8").matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = resolve(dirname(file), target.split("#")[0]);
    if (!path.startsWith(out) || !existsSync(path)) fail(`${relative(out, file)}: link ${target} does not resolve in the package`);
  }
}
report();

const zip = join(root, "dist", `${name}.zip`);
rmSync(zip, { force: true });
execFileSync("zip", ["-qrX", zip, "."], { cwd: out });
console.log(`✓ ${relative(root, zip)}`);
