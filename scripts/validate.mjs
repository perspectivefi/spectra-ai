#!/usr/bin/env node
// Dependency-free checks for the plugin and marketplace manifests:
// every JSON file parses, plugin versions and names agree, every marketplace entry
// points at a real plugin, and every skill has `name` and `description` frontmatter
// matching its directory. Run with `node scripts/validate.mjs`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const errors = [];
const fail = (message) => errors.push(message);
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch (error) {
    fail(`${path}: ${error.message}`);
    return null;
  }
};

const claudeMarket = readJson(".claude-plugin/marketplace.json");
const codexMarket = readJson(".agents/plugins/marketplace.json");
const plugins = new Map();

for (const entry of claudeMarket?.plugins ?? []) {
  const dir = entry.source;
  if (typeof dir !== "string" || !existsSync(join(root, dir))) {
    fail(`.claude-plugin/marketplace.json: plugin "${entry.name}" source ${dir} does not exist`);
    continue;
  }
  plugins.set(entry.name, dir);
}
for (const entry of codexMarket?.plugins ?? []) {
  const dir = entry.source?.path;
  if (!dir || !existsSync(join(root, dir))) fail(`.agents/plugins/marketplace.json: plugin "${entry.name}" path ${dir} does not exist`);
  else if (plugins.get(entry.name) && plugins.get(entry.name).replace(/\/$/, "") !== dir.replace(/\/$/, "")) {
    fail(`plugin "${entry.name}" points to different directories in the two marketplaces`);
  }
}

for (const [name, dir] of plugins) {
  const claude = readJson(join(dir, ".claude-plugin/plugin.json"));
  const codex = readJson(join(dir, ".codex-plugin/plugin.json"));
  const mcp = readJson(join(dir, ".mcp.json"));
  for (const [label, manifest] of [["claude", claude], ["codex", codex]]) {
    if (!manifest) continue;
    if (manifest.name !== name) fail(`${dir} ${label} plugin.json: name "${manifest.name}" should be "${name}"`);
    if (!/^\d+\.\d+\.\d+/.test(manifest.version ?? "")) fail(`${dir} ${label} plugin.json: missing semver version`);
  }
  if (claude && codex && claude.version !== codex.version) fail(`${dir}: claude (${claude.version}) and codex (${codex.version}) versions differ`);
  if (claude?.icon && !existsSync(join(root, dir, claude.icon))) fail(`${dir}: icon ${claude.icon} not found`);
  for (const [server, config] of Object.entries(mcp?.mcpServers ?? {})) {
    if (!/^https:\/\//.test(config.url ?? "")) fail(`${dir}/.mcp.json: server "${server}" needs an https url`);
  }

  const skillsDir = join(root, dir, "skills");
  for (const skill of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
    if (!statSync(join(skillsDir, skill)).isDirectory()) continue;
    const file = join(skillsDir, skill, "SKILL.md");
    if (!existsSync(file)) {
      fail(`${dir}/skills/${skill}: missing SKILL.md`);
      continue;
    }
    const front = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
    const field = (key) => front?.[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();
    if (!front) fail(`${dir}/skills/${skill}/SKILL.md: missing frontmatter`);
    else {
      if (field("name") !== skill) fail(`${dir}/skills/${skill}/SKILL.md: name should be "${skill}"`);
      const description = field("description") ?? "";
      if (description.length < 40 || description.length > 1024) fail(`${dir}/skills/${skill}/SKILL.md: description should be 40-1024 characters`);
    }
  }
}

if (!plugins.size) fail("no plugins found in .claude-plugin/marketplace.json");
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
console.log(`✓ ${plugins.size} plugin(s): manifests and skills are valid`);
