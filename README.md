# aic-lint

A **local linter for AI coding-assistant configs** — checks `CLAUDE.md`, `AGENTS.md`,
skills, subagents and other config files for quality, redundancy, dead references
and accidentally committed secrets.

Supports: **Claude Code**, **Codex CLI**, **Gemini CLI** and any tool built on
`CLAUDE.md` or `AGENTS.md` conventions.

> **Fully local.** No API key, no subscription, no network.
> Zero runtime dependencies — runs anywhere Node.js runs.

---

## Highlights

- **Deterministic** — no LLM calls, same input → same result
- **Zero runtime dependencies** — only `tsx` + `typescript` as dev tools
- **CI-friendly** — `--json` output and meaningful exit codes
- **Multi-tool** — detects `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `docs/ai/` and more

---

## Installation

Requirement: **Node.js ≥ 18**.

### Option A — Global install (recommended)

Clone once and install globally — then `aic-lint` is available in every project:

```bash
git clone <repo-url> ~/.aic-lint
cd ~/.aic-lint
npm install
npm install -g .
```

### Option B — As a git submodule inside an existing repo

```bash
cd my-project
git submodule add <repo-url> .aic-lint
cd .aic-lint && npm install && npm install -g .
```

---

## Usage (CLI)

```bash
aic-lint [project-path] [--no-budget] [--json]
```

Examples:

```bash
# Current directory (Markdown report)
aic-lint .

# A specific project
aic-lint ../my-project

# Without the context-budget table
aic-lint . --no-budget

# Machine-readable (for CI)
aic-lint . --json
```

### Flags

| Flag | Effect |
|---|---|
| `[project-path]` | Root directory of the project to check (default: `.`) |
| `--no-budget` | Omit the context-budget table |
| `--json` | Output JSON instead of Markdown |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No errors (warnings/notices possible) |
| `1` | At least one **ERROR** found |

CI gate example:

```bash
aic-lint . --json || echo "Audit failed"
```

---

## Integration

### Claude Code — `/audit` skill

The repo ships a ready-made slash command: `.claude/commands/audit.md`.

Callable directly inside the tool repo itself:

```
/audit
/audit --no-budget
/audit --json
```

**Use the skill in another project:**

1. Copy `.claude/commands/audit.md` into the target project's `.claude/commands/` directory.
2. The skill calls `aic-lint` directly — no path adjustment needed after a global install.

3. `/audit` is now available in the target project.

### Codex CLI

Run it straight from the terminal or as a shell command in the Codex context:

```bash
aic-lint .
```

The tool detects `AGENTS.md` (and `AGENTS.override.md` / `.codex/AGENTS.md`)
automatically and checks them for quality, structure and parity with `CLAUDE.md` —
useful for projects that use both tools side by side.

---

## What gets checked

| Path | Description |
|---|---|
| `CLAUDE.md` (recursive) | Project context for Claude Code |
| `.claude/commands/*.md` | Slash commands / skills |
| `.claude/agents/*.md` | Subagents |
| `.claude/settings.json` | Claude Code project settings |
| `.claude/settings.local.json` | Local overrides |
| `.mcp.json` | MCP server configuration |
| `AGENTS.md` | Project context for Codex CLI |
| `AGENTS.override.md` | Codex CLI override file |
| `.codex/AGENTS.md` | Project-specific Codex instructions |
| `GEMINI.md` | Project context for Gemini CLI |
| `docs/ai/*.md` | Tool-agnostic AI documentation |

The full list of all checks lives in **[docs/checks.md](docs/checks.md)**.
Concept and background: **[docs/overview.md](docs/overview.md)**.
