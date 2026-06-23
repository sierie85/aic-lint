import { test } from "node:test"
import assert from "node:assert/strict"
import { generateReport } from "./report.js"
import type { ContextBudget, Finding } from "./types.js"

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

test("report renders one budget row per CLAUDE.md and skill", () => {
  const budget: ContextBudget = {
    claudeMdFiles: { "CLAUDE.md": 1000, "src/CLAUDE.md": 500 },
    skills: { "audit.md": 200 },
    totalEstimatedTokens: 1700,
  }
  const out = generateReport("/project", [], budget)
  assert.match(out, /## Context budget \(rough local estimate\)/)
  assert.match(out, /\| CLAUDE\.md \(CLAUDE\.md\) \| 1,000 \|/)
  assert.match(out, /\| CLAUDE\.md \(src\/CLAUDE\.md\) \| 500 \|/)
  assert.match(out, /\| Skill: audit\.md \| 200 \|/)
  assert.match(out, /\*\*Total\*\* \| \*\*1,700\*\*/)
})

test("report has no budget table when budget is omitted", () => {
  const out = generateReport("/project", [])
  assert.doesNotMatch(out, /Context-Budget/)
})
