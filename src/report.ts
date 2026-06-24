import type { ContextBudget, Finding, Score } from "./types.js"

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

function msg(f: Finding): string {
  return f.fix ? `${f.message} — auto-fixable (run --fix)` : f.message
}

export function generateReport(
  root: string,
  findings: Finding[],
  score?: Score,
  budget?: ContextBudget,
): string {
  const lines: string[] = [
    `# Audit Report — ${root}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
  ]

  if (score) {
    lines.push(`## Score: ${score.overall} / 100 (${score.grade})`, "", "| Dimension | Score |", "|---|---|")
    for (const [dim, value] of Object.entries(score.dimensions)) {
      lines.push(`| ${dim.charAt(0).toUpperCase()}${dim.slice(1)} | ${value} |`)
    }
    lines.push("")
  }

  if (budget && budget.totalEstimatedTokens > 0) {
    lines.push(
      "## Context budget (rough local estimate)",
      "",
      "| File | ~Tokens |",
      "|---|---|",
    )
    for (const [relPath, tokens] of Object.entries(budget.files)) {
      lines.push(`| ${relPath} | ${fmt(tokens)} |`)
    }
    lines.push(`| **Total** | **${fmt(budget.totalEstimatedTokens)}** |`, "")
  }

  const errors = findings.filter((f) => f.level === "ERROR")
  const warns = findings.filter((f) => f.level === "WARN")
  const infos = findings.filter((f) => f.level === "INFO")

  if (errors.length > 0) {
    lines.push("## Errors (fix before next session)", "")
    for (const f of errors) lines.push(`- ❌ ${msg(f)}`)
    lines.push("")
  }
  if (warns.length > 0) {
    lines.push("## Warnings", "")
    for (const f of warns) lines.push(`- ⚠️  ${msg(f)}`)
    lines.push("")
  }
  if (infos.length > 0) {
    lines.push("## Notices", "")
    for (const f of infos) lines.push(`- ℹ️  ${msg(f)}`)
    lines.push("")
  }
  if (findings.length === 0) {
    lines.push("## No structural problems found", "")
  }

  return lines.join("\n")
}
