import { test } from "node:test"
import assert from "node:assert/strict"
import { buildContextBudget, estimateTokens } from "./estimate.js"
import { cf, makeConfig } from "./testutil.js"

test("estimateTokens returns 0 for empty text", () => {
  assert.equal(estimateTokens(""), 0)
})

test("estimateTokens grows with text length", () => {
  const short = estimateTokens("hello world")
  const long = estimateTokens("hello world ".repeat(50))
  assert.ok(long > short)
  assert.ok(short > 0)
})

test("buildContextBudget splits always-on from on-demand and sums them", () => {
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", "some content here with several words")],
    skills: [cf("audit.md", "skill content here")],
    agentsMd: cf("AGENTS.md", "codex instructions here"),
  })
  const budget = buildContextBudget(config)
  const byPath = Object.fromEntries(budget.files.map((f) => [f.relPath, f]))
  assert.equal(byPath["CLAUDE.md"].alwaysOn, true)
  assert.equal(byPath["AGENTS.md"].alwaysOn, true)
  assert.equal(byPath["audit.md"].alwaysOn, false) // a skill is on-demand
  assert.equal(budget.alwaysOnTokens, byPath["CLAUDE.md"].tokens + byPath["AGENTS.md"].tokens)
  assert.equal(budget.onDemandTokens, byPath["audit.md"].tokens)
  assert.equal(budget.totalEstimatedTokens, budget.alwaysOnTokens + budget.onDemandTokens)
})

test("buildContextBudget treats a .cursor rule as always-on only with alwaysApply", () => {
  const config = makeConfig({
    cursorRules: [
      cf(".cursor/rules/always.mdc", "---\nalwaysApply: true\n---\nrule"),
      cf(".cursor/rules/auto.mdc", "---\nglobs: '*.ts'\n---\nrule"),
    ],
  })
  const byPath = Object.fromEntries(buildContextBudget(config).files.map((f) => [f.relPath, f]))
  assert.equal(byPath[".cursor/rules/always.mdc"].alwaysOn, true)
  assert.equal(byPath[".cursor/rules/auto.mdc"].alwaysOn, false)
})

test("buildContextBudget handles an empty project", () => {
  const budget = buildContextBudget(makeConfig())
  assert.deepEqual(budget.files, [])
  assert.equal(budget.totalEstimatedTokens, 0)
  assert.equal(budget.alwaysOnTokens, 0)
})
