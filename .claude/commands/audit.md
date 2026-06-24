# /audit — AI Config Audit

Runs a full, **local** audit of the AI-assistant config files in the current
project. No API access, no network, no API key required. The report opens with a
0–100 score (per dimension) followed by prioritized findings.

## Usage

```
/audit [--no-budget] [--json] [--fix] [--fix-dry-run]
```

- No flags: all checks + context budget (local estimate)
- `--no-budget`: omit the context-budget table
- `--json`: machine-readable JSON output (for CI)
- `--fix`: apply safe auto-fixes in place (frontmatter, .gitignore)
- `--fix-dry-run`: preview what --fix would change, without writing

## What gets checked

- **AI config present** — warns if no CLAUDE.md / AGENTS.md / GEMINI.md exists at all
- **CLAUDE.md** — line length, structure (## sections), dead path references
- **Skills** (`.claude/commands/*.md`) — H1 title, descriptive text, overlap, frontmatter
- **Agents** (`.claude/agents/*.md`) — frontmatter (name/description)
- **Redundancy** — same content line in CLAUDE.md and a skill (local, no LLM)
- **JSON configs** (`settings.json`, `settings.local.json`, `.mcp.json`) — valid JSON
- **Gitignore safety** — .env / .claude/settings.local.json must be gitignored
- **Secret scan** — accidentally committed API keys/tokens
- **Context budget** — rough local token estimate per file

## Execution

```bash
aic-lint "$CLAUDE_PROJECT_ROOT"
```

Quick run without the budget table:

```bash
aic-lint "$CLAUDE_PROJECT_ROOT" --no-budget
```

JSON for CI:

```bash
aic-lint "$CLAUDE_PROJECT_ROOT" --json
```

## Exit code

- `0` — no errors (warnings possible)
- `1` — at least one ERROR found
