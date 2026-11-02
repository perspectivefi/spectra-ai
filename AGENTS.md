# AGENTS.md

Instructions for coding agents working on this repository (Claude Code reads this through the `CLAUDE.md` symlink).

## What this is

The public Spectra plugin for AI agents: skills (`plugins/spectra/skills`), plugin manifests for Claude Code (`.claude-plugin/`) and Codex (`.codex-plugin/`), the MCP connection (`plugins/spectra/.mcp.json`) and the marketplace manifests (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`). The MCP server itself is hosted at `https://mcp.spectra.finance`; its source is not in this repository.

## Rules

- **Tool names and behavior come from the server.** When the server's tools change, update the skills and the README tool table in the same change.
- **Present rates honestly.** Rates are percent values, fixed only if PT is held to maturity, and never "guaranteed". Concepts must match docs.spectra.finance.
- **Never sign, broadcast or handle keys.** Skills prepare unsigned transactions only and never ask for a private key or seed phrase.
- **Jurisdictions.** Tokenized-equity (`stock`-tagged) markets are not offered to persons in the US, UK, Canada, Australia or Singapore.
- **Nothing internal.** This repository is public: no roadmap notes, incident details, internal URLs or credentials.

## Checks

- `node scripts/validate.mjs`: manifests parse, versions match, and every skill has valid frontmatter.
- `claude plugin validate plugins/spectra` and `claude plugin validate .`: run after changing the plugin or the marketplace.
