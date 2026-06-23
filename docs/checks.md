# Check reference

All checks run purely locally and deterministically. Every finding has a level:
**ERROR** (exit code 1), **WARN** or **INFO**.

## Structure & quality

### CLAUDE.md present
- **Level:** WARN
- Warns when no `CLAUDE.md` is found in the project.

### CLAUDE.md length
- **Level:** WARN (> 80 lines) · ERROR (> 150 lines)
- A long `CLAUDE.md` costs context on every session. Recommendation: < 80 lines.

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
  `AGENTS.override.md`, `.codex/AGENTS.md`, `GEMINI.md` and `docs/ai/*.md`.

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
  lines are excluded.

## Multi-tool parity

### Codex ↔ CLAUDE.md
- **Level:** WARN / INFO
- WARN: Codex config present (`AGENTS.md`, `AGENTS.override.md` or `.codex/AGENTS.md`), but no `CLAUDE.md`.
- INFO: `CLAUDE.md` present, but no Codex config — Codex users have no context.

### docs/ai present
- **Level:** INFO
- Recommends a tool-agnostic AI baseline under `docs/ai/`.

## Frontmatter

### Command frontmatter
- **Level:** WARN / INFO
- WARN: frontmatter block opened but not closed with `---`.
- INFO: valid frontmatter without a `description`.

### Agent frontmatter
- **Level:** WARN
- Warns when an agent (`.claude/agents/*.md`) has **no** frontmatter, it is not
  closed, or the `name` / `description` fields are missing.

## Config validity

### JSON configs
- **Level:** ERROR
- `.claude/settings.json`, `.claude/settings.local.json` and `.mcp.json` are checked
  for valid JSON. A syntax error is an ERROR.

## Security

### Secret scan
- **Level:** ERROR
- Scans all collected files for patterns that look like real secrets. Matches are
  **redacted** in the output (e.g. `sk-a…yz`).
- Detected types: Anthropic, OpenAI, AWS, GitHub, Slack, Google keys as well as
  private-key headers (`-----BEGIN ... PRIVATE KEY-----`).

---

## Summary

| Check | Level |
|---|---|
| CLAUDE.md present | WARN |
| CLAUDE.md length | WARN / ERROR |
| CLAUDE.md structure | WARN |
| Dead references | ERROR |
| Skill quality | WARN |
| Skill overlap | WARN |
| Redundancy | WARN |
| Codex ↔ CLAUDE.md | WARN / INFO |
| docs/ai present | INFO |
| Command frontmatter | WARN / INFO |
| Agent frontmatter | WARN |
| JSON configs | ERROR |
| Secret scan | ERROR |
