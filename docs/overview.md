# Product overview: aic-lint

## The problem

AI-assistant projects accumulate configuration over time: one or more `CLAUDE.md`
files, custom slash commands under `.claude/commands/`, subagents, `settings.json`,
MCP servers, plus `AGENTS.md`/`GEMINI.md` for mixed-tool teams.

These files are rarely maintained systematically. Typical problems:

- **Bloated `CLAUDE.md`** — grows unchecked, costs context on every session
- **Redundancy** — the same instruction lives in `CLAUDE.md` *and* in a skill
- **Dead references** — paths point at files that were long since renamed/deleted
- **Weak skills** — a command without a description, an agent without frontmatter
- **Broken configs** — `settings.json` with a syntax error fails silently
- **Leaked secrets** — an API key accidentally lands in a config file

## The solution

A **local, deterministic linter** built specifically for AI-assistant configuration —
essentially "ESLint for `.claude/` and friends". It reads all relevant files, checks
them against a set of static rules and emits a prioritized report.

## Design principles

### 1. Fully local, no API

The tool makes **zero network calls**. It needs neither an Anthropic API key nor a
subscription. There are two reasons:

- **Access** — the Anthropic API is a separate, paid product; a Claude Pro/Max
  subscription does *not* unlock it.
- **Determinism** — the same input always yields the same result, ideal for CI.

The one thing that used to require the API (exact token counting) is replaced by a
**local estimate** (see "Context budget").

### 2. Zero runtime dependencies

Apart from `tsx`/`typescript` (dev tooling), the tool has no dependencies. Even
frontmatter parsing and secret scanning are implemented dependency-free. This keeps
the tool small, portable and auditable.

### 3. Severity-based findings

Every finding has a level:

- **ERROR** — should be fixed before the next session (causes exit code 1)
- **WARN** — quality issue, worth a look
- **INFO** — hint / recommendation

## Architecture

A lean pipeline:

```
collect  →  analyze  →  (estimate)  →  report
```

| Step | Module | Responsibility |
|---|---|---|
| collect | `collect.ts` | Read all config files → `ProjectConfig` |
| analyze | `analyze.ts` | Run static checks → `Finding[]` |
| estimate | `estimate.ts` | Local token estimate → `ContextBudget` |
| report | `report.ts` | Render the Markdown report |

`audit.ts` orchestrates the steps and returns a structured `AuditResult`, which
`index.ts` then emits as Markdown or JSON.

## Context budget (local estimate)

Anthropic does not publish an offline tokenizer for Claude 3/4 — exact token counts
are impossible without the API. The tool therefore estimates the context budget via a
heuristic (a blend of character and word counts). The numbers are marked as an
**estimate** and are best suited for *relative* comparison ("which file is the
heaviest?"), not as an exact billing basis.

## Usage modes

- **CLI** — straight in the terminal, Markdown or `--json`
- **`/audit` skill** — inside Claude Code
- **CI gate** — via exit code and `--json`

## Scope

The tool is **not** a replacement for an LLM review. It checks what can be verified
statically and reliably. Content evaluation ("is this instruction well phrased?")
is deliberately out of scope, because that would require an API call — and that is
explicitly a non-goal here.
