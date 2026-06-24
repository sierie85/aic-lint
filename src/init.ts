import { existsSync, mkdirSync, writeFileSync } from "fs"
import { homedir } from "os"
import { dirname, join } from "path"

// Single source of truth for the Claude Code /audit slash command. The repo's
// own .claude/commands/audit.md is kept identical to this (guarded by a test),
// and `aic-lint init` writes this content into a target project.
export const CLAUDE_AUDIT_COMMAND = `# /audit — AI Config Audit

Runs a full, **local** audit of the AI-assistant config files in the current
project. No API access, no network, no API key required.

## Usage

\`\`\`
/audit [--no-budget] [--json]
\`\`\`

- No flags: all checks + context budget (local estimate)
- \`--no-budget\`: omit the context-budget table
- \`--json\`: machine-readable JSON output (for CI)

## What gets checked

- **AI config present** — warns if no CLAUDE.md / AGENTS.md / GEMINI.md exists at all
- **CLAUDE.md** — line length, structure (## sections), dead path references
- **Skills** (\`.claude/commands/*.md\`) — H1 title, descriptive text, overlap, frontmatter
- **Agents** (\`.claude/agents/*.md\`) — frontmatter (name/description)
- **Redundancy** — same content line in CLAUDE.md and a skill (local, no LLM)
- **JSON configs** (\`settings.json\`, \`settings.local.json\`, \`.mcp.json\`) — valid JSON
- **Secret scan** — accidentally committed API keys/tokens
- **Context budget** — rough local token estimate per file

## Execution

\`\`\`bash
aic-lint "$CLAUDE_PROJECT_ROOT"
\`\`\`

Quick run without the budget table:

\`\`\`bash
aic-lint "$CLAUDE_PROJECT_ROOT" --no-budget
\`\`\`

JSON for CI:

\`\`\`bash
aic-lint "$CLAUDE_PROJECT_ROOT" --json
\`\`\`

## Exit code

- \`0\` — no errors (warnings possible)
- \`1\` — at least one ERROR found
`

// Codex CLI custom prompt. Codex sends the file content as the user message
// when /audit is selected, so it is phrased as an instruction (not a doc) and
// works from the current project directory.
export const CODEX_AUDIT_PROMPT = `---
description: Audit this project's AI-assistant config files with aic-lint
---
Run \`aic-lint .\` in the current project root, then report the findings.

Group any warnings and errors by severity and suggest concrete fixes. Use
\`aic-lint . --json\` if you need to parse the results programmatically, and
\`aic-lint . --no-budget\` to skip the context-budget table.
`

export type InitTarget = "claude" | "codex"

export interface InitOptions {
  // Explicit targets. When omitted, auto-detect from existing tool homes.
  targets?: InitTarget[]
  // Install the Claude command at repo level (<cwd>/.claude/commands) instead
  // of user level. Codex prompts are always user-level (~/.codex/prompts).
  project?: boolean
  homeDir?: string
  cwd?: string
}

export interface InitResult {
  written: { target: InitTarget; path: string }[]
}

function detectTargets(homeDir: string): InitTarget[] {
  const found: InitTarget[] = []
  if (existsSync(join(homeDir, ".claude"))) found.push("claude")
  if (existsSync(join(homeDir, ".codex"))) found.push("codex")
  // Nothing detected → default to Claude Code, the primary tool.
  return found.length > 0 ? found : ["claude"]
}

function targetPath(target: InitTarget, homeDir: string, cwd: string, project: boolean): string {
  if (target === "claude") {
    const base = project ? cwd : homeDir
    return join(base, ".claude", "commands", "audit.md")
  }
  // Codex custom prompts are user-level only.
  return join(homeDir, ".codex", "prompts", "audit.md")
}

const CONTENT: Record<InitTarget, string> = {
  claude: CLAUDE_AUDIT_COMMAND,
  codex: CODEX_AUDIT_PROMPT,
}

// Installs the /audit command into the requested (or detected) tool homes.
export function runInit(options: InitOptions = {}): InitResult {
  const homeDir = options.homeDir ?? homedir()
  const cwd = options.cwd ?? process.cwd()
  const project = options.project ?? false
  const targets = options.targets?.length ? [...new Set(options.targets)] : detectTargets(homeDir)

  const written = targets.map((target) => {
    const path = targetPath(target, homeDir, cwd, project)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, CONTENT[target])
    return { target, path }
  })
  return { written }
}
