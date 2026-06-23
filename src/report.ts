import type { ContextBudget, Finding } from "./types.js"

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

export function generateReport(
  root: string,
  findings: Finding[],
  budget?: ContextBudget,
): string {
  const lines: string[] = [
    `# Audit Report — ${root}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
  ]

  if (budget) {
    lines.push(
      "## Context budget (rough local estimate)",
      "",
      "> Estimated without the Anthropic API — may differ from real token counts.",
      "",
      "| Layer | ~Tokens |",
      "|---|---|",
    )
    for (const [relPath, tokens] of Object.entries(budget.claudeMdFiles)) {
      lines.push(`| CLAUDE.md (${relPath}) | ${fmt(tokens)} |`)
    }
    for (const [name, tokens] of Object.entries(budget.skills)) {
      lines.push(`| Skill: ${name} | ${fmt(tokens)} |`)
    }
    lines.push(`| **Total** | **${fmt(budget.totalEstimatedTokens)}** |`, "")
  }

  const errors = findings.filter((f) => f.level === "ERROR")
  const warns = findings.filter((f) => f.level === "WARN")
  const infos = findings.filter((f) => f.level === "INFO")

  if (errors.length > 0) {
    lines.push("## Errors (fix before next session)", "")
    for (const f of errors) lines.push(`- ❌ ${f.message}`)
    lines.push("")
  }
  if (warns.length > 0) {
    lines.push("## Warnings", "")
    for (const f of warns) lines.push(`- ⚠️  ${f.message}`)
    lines.push("")
  }
  if (infos.length > 0) {
    lines.push("## Notices", "")
    for (const f of infos) lines.push(`- ℹ️  ${f.message}`)
    lines.push("")
  }
  if (findings.length === 0) {
    lines.push("## No structural problems found", "")
  }

  return lines.join("\n")
}
