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

The tool compiles to plain JavaScript (`dist/`) and runs on Node alone — `tsx` and
`typescript` are pure dev tooling. Even frontmatter parsing and secret scanning are
implemented dependency-free. This keeps the tool small, portable and auditable.

`dist/` is built on demand by the `prepack` script (so `npm pack` always ships a
fresh, runnable build) and is not committed. The published artifact is a release
tarball installed with `npm i -g <tarball-url>`.

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

The budget separates **always-on** context — files loaded into the model on *every*
session (all `CLAUDE.md`, `AGENTS.md`/`AGENTS.override.md`/`.codex/AGENTS.md`,
`GEMINI.md`, `.cursorrules` and `.cursor/rules/*.mdc` with `alwaysApply: true`) — from
**on-demand** context (skills, subagents, `docs/ai`, conditional Cursor rules). The
always-on number is the per-session cost that actually matters; the `Context budget`
check (dimension *efficiency*) warns when it exceeds ~8,000 tokens (error at ~16,000).

## Usage modes

- **CLI** — straight in the terminal, Markdown or `--json`
- **`/audit` skill** — inside Claude Code
- **CI gate** — via exit code and `--json`
- **Auto-fix** — `--fix` applies safe, deterministic corrections in place
  (`--fix-dry-run` previews them); see "Auto-fix" below

## Score

The report opens with a **0–100 score** and a letter grade (A–F), computed locally
and deterministically — no LLM, no network. Each check contributes to one of five
dimensions: **structure**, **efficiency** (token cost), **maintainability**,
**validity** and **security**. A dimension starts at 100 and loses points per finding
(ERROR > WARN > INFO), and the overall score is a weighted average (security weighted
highest). The numbers are a relative health signal, not an absolute audit grade.

## Auto-fix

`--fix` applies only **safe, deterministic, non-destructive** corrections, in line
with the "deterministic, no LLM" principle. Each check may attach a `Fix` to its
finding (a pure `content => content` transform plus a target file); the applier
groups fixes per file, chains them and writes the result (`--fix-dry-run` skips the
write and just reports). Today that covers frontmatter scaffolding and `.gitignore`
hygiene. Anything that needs human judgement — secrets, invalid JSON, dead
references, oversized files, redundancy — is deliberately **never** auto-fixed.

## Scope

The tool is **not** a replacement for an LLM review. It checks what can be verified
statically and reliably. Content evaluation ("is this instruction well phrased?")
is deliberately out of scope, because that would require an API call — and that is
explicitly a non-goal here.
