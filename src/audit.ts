import { analyze } from "./analyze.js"
import { collect } from "./collect.js"
import { buildContextBudget } from "./estimate.js"
import { generateReport } from "./report.js"
import type { ContextBudget, Finding } from "./types.js"

export interface RunOptions {
  noBudget?: boolean
}

export interface AuditResult {
  projectRoot: string
  findings: Finding[]
  budget?: ContextBudget
  hasErrors: boolean
}

export function runAudit(projectRoot: string, options: RunOptions = {}): AuditResult {
  const config = collect(projectRoot)
  const findings = analyze(config)
  const budget = options.noBudget ? undefined : buildContextBudget(config)
  const hasErrors = findings.some((f) => f.level === "ERROR")
  return { projectRoot, findings, budget, hasErrors }
}

export function toMarkdown(result: AuditResult): string {
  return generateReport(result.projectRoot, result.findings, result.budget)
}
