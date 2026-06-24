import { analyze } from "./analyze.js"
import { collect } from "./collect.js"
import { buildContextBudget } from "./estimate.js"
import { generateReport } from "./report.js"
import { computeScore } from "./score.js"
import { loadSettings } from "./settings.js"
import type { ContextBudget, Finding, Score } from "./types.js"

export interface RunOptions {
  noBudget?: boolean
}

export interface AuditResult {
  projectRoot: string
  findings: Finding[]
  score: Score
  budget?: ContextBudget
  hasErrors: boolean
}

export function runAudit(projectRoot: string, options: RunOptions = {}): AuditResult {
  const config = collect(projectRoot)
  const settings = loadSettings(projectRoot)
  const findings = analyze(config, undefined, settings)
  const score = computeScore(findings)
  const budget = options.noBudget ? undefined : buildContextBudget(config)
  const hasErrors = findings.some((f) => f.level === "ERROR")
  return { projectRoot, findings, score, budget, hasErrors }
}

export function toMarkdown(result: AuditResult): string {
  return generateReport(result.projectRoot, result.findings, result.score, result.budget)
}
