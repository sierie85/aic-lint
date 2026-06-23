import { test } from "node:test"
import assert from "node:assert/strict"
import { generateReport } from "./report.js"
import type { ContextBudget, Finding } from "./types.js"

test("report renders header and 'no problems' when empty", () => {
  const out = generateReport("/project", [])
  assert.match(out, /# Audit Report — \/project/)
  assert.match(out, /## Keine strukturellen Probleme gefunden/)
})

test("report groups findings into sections by level", () => {
  const findings: Finding[] = [
    { level: "ERROR", message: "kaputt" },
    { level: "WARN", message: "achtung" },
    { level: "INFO", message: "hinweis" },
  ]
  const out = generateReport("/project", findings)
  assert.match(out, /## Fehler \(beheben vor nächster Session\)[\s\S]*❌ kaputt/)
  assert.match(out, /## Warnungen[\s\S]*⚠️\s+achtung/)
  assert.match(out, /## Hinweise[\s\S]*ℹ️\s+hinweis/)
})

test("report omits sections that have no findings", () => {
  const out = generateReport("/project", [{ level: "WARN", message: "nur warnung" }])
  assert.doesNotMatch(out, /## Fehler/)
  assert.doesNotMatch(out, /## Hinweise/)
})

test("report renders one budget row per CLAUDE.md and skill", () => {
  const budget: ContextBudget = {
    claudeMdFiles: { "CLAUDE.md": 1000, "src/CLAUDE.md": 500 },
    skills: { "audit.md": 200 },
    totalEstimatedTokens: 1700,
  }
  const out = generateReport("/project", [], budget)
  assert.match(out, /## Context-Budget \(grobe lokale Schätzung\)/)
  assert.match(out, /\| CLAUDE\.md \(CLAUDE\.md\) \| 1\.000 \|/)
  assert.match(out, /\| CLAUDE\.md \(src\/CLAUDE\.md\) \| 500 \|/)
  assert.match(out, /\| Skill: audit\.md \| 200 \|/)
  assert.match(out, /\*\*Gesamt\*\* \| \*\*1\.700\*\*/)
})

test("report has no budget table when budget is omitted", () => {
  const out = generateReport("/project", [])
  assert.doesNotMatch(out, /Context-Budget/)
})
