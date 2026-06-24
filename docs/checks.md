# Check reference

All checks run purely locally and deterministically. Every finding has a level:
**ERROR** (exit code 1), **WARN** or **INFO**. The report also opens with a **0–100
score** per dimension (structure / efficiency / maintainability / validity / security)
plus a letter grade — see [overview.md](overview.md#score).

Some findings are **auto-fixable** — run `aic-lint . --fix` to apply safe,
deterministic corrections in place, or `--fix-dry-run` to preview them. Only
non-destructive fixes are applied (frontmatter scaffolding, `.gitignore` entries);
secrets, invalid JSON and dead references are always left for a human.

## Structure & quality

### AI config present
- **Level:** WARN
- Warns when no AI config files are found at all — none of `CLAUDE.md`, `AGENTS.md`,
  `AGENTS.override.md`, `.codex/AGENTS.md`, `GEMINI.md` or Cursor rules
  (`.cursorrules`, `.cursor/rules/*.mdc`). Having only one of them is perfectly fine.

### CLAUDE.md length
- **Level:** WARN (> 80 lines) · ERROR (> 150 lines)
- A long `CLAUDE.md` costs context on every session. Recommendation: < 80 lines.
  The finding also reports the estimated token cost.

### Context budget (always-on)
- **Level:** WARN (> 8,000 tokens) · ERROR (> 16,000 tokens)
- Sums the estimated tokens of all **always-on** files (loaded every session: all
  `CLAUDE.md`, `AGENTS.md`/`AGENTS.override.md`/`.codex/AGENTS.md`, `GEMINI.md`,
  `.cursorrules` and `.cursor/rules/*.mdc` with `alwaysApply: true`). On-demand files
  (skills, subagents, `docs/ai`, conditional Cursor rules) do **not** count.
- The finding names the heaviest always-on file so you know where to trim.

### CLAUDE.md structure
- **Level:** WARN
- A `CLAUDE.md` with > 20 lines and not a single `##` section counts as
  unstructured prose.

### Dead references
- **Level:** ERROR
- Path-like file references in backticks (containing `/`, e.g. `` `src/foo.ts` ``) or
  Markdown links that do not exist in the project. Bare filenames
  (`` `settings.json` ``), URLs, anchors (`#...`) and globs are ignored.
- Checked in every Markdown source: `CLAUDE.md`, skills, agents, `AGENTS.md`,
  `AGENTS.override.md`, `.codex/AGENTS.md`, `GEMINI.md`, `.cursorrules`,
  `.cursor/rules/*.mdc` and `docs/ai/*.md`.

### Skill quality
- **Level:** WARN
- A skill (> 10 lines) without an H1 title **or** without descriptive prose
  (code blocks only) is hard for the assistant to place.

### Skill overlap
- **Level:** WARN
- Two skills that share **2 or more identical `##` headings** probably cover the
  same topic.

### Redundancy
- **Level:** WARN
- The same content line (≥ 40 characters, normalized) appears in multiple files
  at once — e.g. in `CLAUDE.md` *and* a skill. Headings, code blocks and short
  lines are excluded. The finding estimates the tokens wasted by the duplication.

## Frontmatter

### Command frontmatter
- **Level:** WARN / INFO
- WARN: frontmatter block opened but not closed with `---`.
- INFO: valid frontmatter without a `description`. **Auto-fixable** — `--fix` adds a
  placeholder `description`.

### Agent frontmatter
- **Level:** WARN · **auto-fixable**
- Warns when an agent (`.claude/agents/*.md`) has **no** frontmatter, it is not
  closed, or the `name` / `description` fields are missing.
- `--fix` scaffolds a frontmatter block (or the missing field) with placeholder
  values; an unclosed block is left untouched (ambiguous).

## Config validity

### JSON configs
- **Level:** ERROR
- `.claude/settings.json`, `.claude/settings.local.json` and `.mcp.json` are checked
  for valid JSON. A syntax error is an ERROR.

## Security

### Gitignore safety
- **Level:** WARN · **auto-fixable**
- Warns when a sensitive file that *exists* in the project is not listed in
  `.gitignore`. Currently checked: `.env` and `.claude/settings.local.json`.
- `--fix` appends the missing entry to `.gitignore` (creating the file if needed).

### Secret scan
- **Level:** ERROR
- Scans all collected files for patterns that look like real secrets. Matches are
  **redacted** in the output (e.g. `sk-a…yz`).
- Detected types (~24): Anthropic, OpenAI, AWS (incl. temporary `ASIA`), GitHub
  token/PAT, GitLab PAT, Slack token/webhook, Google, Stripe (secret/restricted),
  Twilio, SendGrid, Mailgun, npm, PyPI, DigitalOcean, Square, Shopify, Telegram bot,
  Hugging Face, Notion, plus private-key headers (`-----BEGIN ... PRIVATE KEY-----`).
- Only prefix-specific patterns are used (no generic JWT/high-entropy matching) to
  keep false positives low.

---

## Summary

| Check | Level |
|---|---|
| AI config present | WARN |
| CLAUDE.md length | WARN / ERROR |
| Context budget (always-on) | WARN / ERROR |
| CLAUDE.md structure | WARN |
| Dead references | ERROR |
| Skill quality | WARN |
| Skill overlap | WARN |
| Redundancy | WARN |
| Command frontmatter | WARN / INFO |
| Agent frontmatter | WARN |
| JSON configs | ERROR |
| Gitignore safety | WARN |
| Secret scan | ERROR |
