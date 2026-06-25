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
      `**Always-on context: ~${fmt(budget.alwaysOnTokens)} tokens** — loaded every session`,
      `On-demand context: ~${fmt(budget.onDemandTokens)} tokens`,
      "",
      "| File | ~Tokens | Loaded |",
      "|---|---|---|",
    )
    const ordered = [...budget.files].sort((a, b) => Number(b.alwaysOn) - Number(a.alwaysOn))
    for (const f of ordered) {
      lines.push(`| ${f.relPath} | ${fmt(f.tokens)} | ${f.alwaysOn ? "always" : "on-demand"} |`)
    }
    lines.push(`| **Total** | **${fmt(budget.totalEstimatedTokens)}** | |`, "")
  }

  if (budget && budget.attention.length > 0) {
    lines.push(
      "## Always-on attention (estimate)",
      "",
      'Heuristic: models attend best to the start and end of long context; large files',
      'in the middle ("lost in the middle") risk being under-weighted. Not a measured value.',
      "",
      "| # | File | ~Tokens | Share | Position | Risk |",
      "|---|---|---|---|---|---|",
    )
    budget.attention.forEach((a, i) => {
      const risk = a.risk ? "⚠️  under-weighted" : "ok"
      lines.push(`| ${i + 1} | ${a.relPath} | ${fmt(a.tokens)} | ${a.share}% | ${a.position} | ${risk} |`)
    })
    lines.push("")
  }

  const sections: { level: Finding["level"]; heading: string; prefix: string }[] = [
    { level: "ERROR", heading: "Errors (fix before next session)", prefix: "- ❌ " },
    { level: "WARN", heading: "Warnings", prefix: "- ⚠️  " },
    { level: "INFO", heading: "Notices", prefix: "- ℹ️  " },
  ]
  for (const { level, heading, prefix } of sections) {
    const group = findings.filter((f) => f.level === level)
    if (group.length === 0) continue
    lines.push(`## ${heading}`, "")
    for (const f of group) lines.push(`${prefix}${msg(f)}`)
    lines.push("")
  }
  if (findings.length === 0) {
    lines.push("## No structural problems found", "")
  }

  return lines.join("\n")
}
