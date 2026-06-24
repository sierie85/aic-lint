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
- **Scored** — a local 0–100 score (A–F) across four dimensions, no API needed
- **Auto-fix** — `--fix` applies safe corrections (frontmatter, `.gitignore`)
- **Zero runtime dependencies** — only `tsx` + `typescript` as dev tools
- **CI-friendly** — `--json` output and meaningful exit codes
- **Multi-tool** — detects `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `docs/ai/` and more
- **Secret scan** — ~24 prefix-specific token patterns, redacted in output

---

## Installation

Requirement: **Node.js ≥ 18**.

### One-line install (recommended)

Install globally straight from GitHub — no clone, no manual build:

```bash
npm install -g github:sierie85/aic-lint
```

`aic-lint` is now available in every project. To update, run the same command again.

Then make the `/audit` slash command available in **all** your projects at once:

```bash
aic-lint init
```

`init` auto-detects which assistants you use and installs the command for each:

- **Claude Code** → `~/.claude/commands/audit.md`
- **Codex CLI** → `~/.codex/prompts/audit.md`

It installs to whichever tool home (`~/.claude`, `~/.codex`) already exists, so `/audit`
works everywhere without copying anything. Override the detection with flags:

| Flag | Effect |
|---|---|
| `--claude` | Install only the Claude Code command |
| `--codex` | Install only the Codex CLI prompt |
| `--all` | Install for both tools |
| `--project` | Put the Claude command in the current repo (`./.claude/commands/`) instead of user-level |

### From a local clone (for development)

```bash
git clone https://github.com/sierie85/aic-lint ~/.aic-lint
cd ~/.aic-lint
npm install        # installs dev tools and builds dist/
npm install -g .
```

---

## Usage (CLI)

```bash
aic-lint [project-path] [--no-budget] [--json] [--fix] [--fix-dry-run]
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

# Auto-fix safe issues (frontmatter scaffolding, .gitignore hygiene)
aic-lint . --fix

# Preview what --fix would change, without writing
aic-lint . --fix-dry-run
```

### Flags

| Flag | Effect |
|---|---|
| `[project-path]` | Root directory of the project to check (default: `.`) |
| `--no-budget` | Omit the context-budget table |
| `--json` | Output JSON instead of Markdown |
| `--fix` | Apply safe auto-fixes in place (frontmatter scaffolding, `.gitignore` entries) |
| `--fix-dry-run` | Show what `--fix` would change, without modifying any files |

Auto-fixable findings are marked with *“auto-fixable (run --fix)”* in the report.
Only deterministic, non-destructive fixes are applied — secrets, invalid JSON and
dead references are always left for you to resolve.

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

### Claude Code & Codex CLI — `/audit` command

Install the slash command once for every project (auto-detects your tools):

```bash
aic-lint init            # detected tools, user-level (all projects)
aic-lint init --all      # force both Claude Code and Codex CLI
aic-lint init --project  # Claude command in the current repo only
```

Then call it inside the assistant:

```
/audit
/audit --no-budget
/audit --json
```

The command just runs `aic-lint` on the current project, so no path adjustment is
ever needed after the global install. See [Installation](#one-line-install-recommended)
for the full flag list.

### Codex CLI

Run it straight from the terminal or as a shell command in the Codex context:

```bash
aic-lint .
```

The tool detects `AGENTS.md` (and `AGENTS.override.md` / `.codex/AGENTS.md`)
automatically and checks them for quality, structure, dead references and secrets —
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
| `.gitignore` | Ensures sensitive files (`.env`, `.claude/settings.local.json`) are ignored |

The full list of all checks lives in **[docs/checks.md](docs/checks.md)**.
Concept and background: **[docs/overview.md](docs/overview.md)**.

---

## License

[MIT](LICENSE) © sierie85
