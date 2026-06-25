import { test } from "node:test"
import assert from "node:assert/strict"
import { generateReport } from "./report.js"
import type { ContextBudget, Finding, Score } from "./types.js"

test("report renders header and 'no problems' when empty", () => {
  const out = generateReport("/project", [])
  assert.match(out, /# Audit Report — \/project/)
  assert.match(out, /## No structural problems found/)
})

test("report groups findings into sections by level", () => {
  const findings: Finding[] = [
    { level: "ERROR", message: "broken" },
    { level: "WARN", message: "watch out" },
    { level: "INFO", message: "note" },
  ]
  const out = generateReport("/project", findings)
  assert.match(out, /## Errors \(fix before next session\)[\s\S]*❌ broken/)
  assert.match(out, /## Warnings[\s\S]*⚠️\s+watch out/)
  assert.match(out, /## Notices[\s\S]*ℹ️\s+note/)
})

test("report omits sections that have no findings", () => {
  const out = generateReport("/project", [{ level: "WARN", message: "just a warning" }])
  assert.doesNotMatch(out, /## Errors/)
  assert.doesNotMatch(out, /## Notices/)
})

test("report renders the budget with always-on split and Loaded column", () => {
  const budget: ContextBudget = {
    files: [
      { relPath: "CLAUDE.md", tokens: 1000, alwaysOn: true },
      { relPath: "AGENTS.md", tokens: 500, alwaysOn: true },
      { relPath: ".claude/commands/audit.md", tokens: 200, alwaysOn: false },
    ],
    alwaysOnTokens: 1500,
    onDemandTokens: 200,
    totalEstimatedTokens: 1700,
    attention: [],
  }
  const out = generateReport("/project", [], undefined, budget)
  assert.match(out, /## Context budget \(rough local estimate\)/)
  assert.match(out, /\*\*Always-on context: ~1,500 tokens\*\*/)
  assert.match(out, /\| CLAUDE\.md \| 1,000 \| always \|/)
  assert.match(out, /\| \.claude\/commands\/audit\.md \| 200 \| on-demand \|/)
  assert.match(out, /\*\*Total\*\* \| \*\*1,700\*\*/)
})

test("report skips budget section when total is 0", () => {
  const budget: ContextBudget = { files: [], alwaysOnTokens: 0, onDemandTokens: 0, totalEstimatedTokens: 0, attention: [] }
  const out = generateReport("/project", [], undefined, budget)
  assert.doesNotMatch(out, /Context budget/)
})

test("report renders the attention section with position and risk", () => {
  const budget: ContextBudget = {
    files: [],
    alwaysOnTokens: 10000,
    onDemandTokens: 0,
    totalEstimatedTokens: 10000,
    attention: [
      { relPath: "CLAUDE.md", tokens: 5400, share: 54, position: "top", risk: false },
      { relPath: ".cursor/rules/style.mdc", tokens: 3000, share: 30, position: "middle", risk: true },
    ],
  }
  const out = generateReport("/project", [], undefined, budget)
  assert.match(out, /## Always-on attention \(estimate\)/)
  assert.match(out, /lost in the middle/)
  assert.match(out, /\| 1 \| CLAUDE\.md \| 5,400 \| 54% \| top \| ok \|/)
  assert.match(out, /\| 2 \| \.cursor\/rules\/style\.mdc \| 3,000 \| 30% \| middle \| ⚠️\s+under-weighted \|/)
})

test("report has no attention section without always-on files", () => {
  const budget: ContextBudget = { files: [], alwaysOnTokens: 0, onDemandTokens: 0, totalEstimatedTokens: 0, attention: [] }
  assert.doesNotMatch(generateReport("/project", [], undefined, budget), /Always-on attention/)
})

test("report has no budget table when budget is omitted", () => {
  const out = generateReport("/project", [])
  assert.doesNotMatch(out, /Context budget/)
})

test("report renders the score block with grade and dimensions", () => {
  const score: Score = {
    overall: 84,
    grade: "B",
    dimensions: { security: 75, structure: 92, efficiency: 88, maintainability: 80, validity: 100 },
  }
  const out = generateReport("/project", [], score)
  assert.match(out, /## Score: 84 \/ 100 \(B\)/)
  assert.match(out, /\| Security \| 75 \|/)
  assert.match(out, /\| Validity \| 100 \|/)
})
