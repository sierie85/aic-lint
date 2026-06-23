# /audit — AI Config Audit

Runs a full, **local** audit of the AI-assistant config files in the current
project. No API access, no network, no API key required.

## Usage

```
/audit [--no-budget] [--json]
```

- No flags: all checks + context budget (local estimate)
- `--no-budget`: omit the context-budget table
- `--json`: machine-readable JSON output (for CI)

## What gets checked

- **CLAUDE.md** — line length, structure (## sections), dead path references
- **Skills** (`.claude/commands/*.md`) — H1 title, descriptive text, overlap, frontmatter
- **Agents** (`.claude/agents/*.md`) — frontmatter (name/description)
- **JSON configs** (`settings.json`, `settings.local.json`, `.mcp.json`) — valid JSON
- **AGENTS.md / GEMINI.md** — presence, consistency with CLAUDE.md
- **/docs/ai/** — tool-agnostic AI baseline present?
- **Redundancy** — same content in CLAUDE.md and skills (local, no LLM)
- **Secret scan** — accidentally committed API keys/tokens
- **Context budget** — rough local token estimate per file

## Execution

```bash
cd /workspace/repos/audit_tool && npx tsx src/index.ts "$CLAUDE_PROJECT_ROOT"
```

Quick run without the budget table:

```bash
cd /workspace/repos/audit_tool && npx tsx src/index.ts "$CLAUDE_PROJECT_ROOT" --no-budget
```

JSON for CI:

```bash
cd /workspace/repos/audit_tool && npx tsx src/index.ts "$CLAUDE_PROJECT_ROOT" --json
```

## Exit code

- `0` — no errors (warnings possible)
- `1` — at least one ERROR found
