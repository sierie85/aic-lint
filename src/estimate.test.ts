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
  assert.deepEqual(budget.attention, [])
})

test("buildContextBudget ranks always-on files with position + risk for a large context", () => {
  const big = "word ".repeat(2500) // ~3270 tokens each → 3 files clear the 8000 gate
  const config = makeConfig({
    claudeMdFiles: [cf("a-top.md", big), cf("b-middle.md", big), cf("c-bottom.md", big)],
  })
  const { attention, alwaysOnTokens } = buildContextBudget(config)
  assert.ok(alwaysOnTokens > 8000)
  const by = Object.fromEntries(attention.map((a) => [a.relPath, a]))
  assert.equal(by["a-top.md"].position, "top")
  assert.equal(by["b-middle.md"].position, "middle")
  assert.equal(by["c-bottom.md"].position, "bottom")
  assert.equal(by["b-middle.md"].risk, true) // substantial file in the middle
  assert.equal(by["a-top.md"].risk, false)
  assert.ok(Math.abs(attention.reduce((s, a) => s + a.share, 0) - 100) <= 1)
})

test("buildContextBudget marks position n/a and no risk for a small always-on context", () => {
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "short content"), cf("x/CLAUDE.md", "more")] })
  const { attention, alwaysOnTokens } = buildContextBudget(config)
  assert.ok(alwaysOnTokens < 8000)
  assert.ok(attention.length > 0)
  assert.ok(attention.every((a) => a.position === "n/a" && a.risk === false))
})

test("buildContextBudget sorts attention by token weight (heaviest first)", () => {
  const config = makeConfig({
    claudeMdFiles: [cf("small.md", "word ".repeat(50)), cf("big.md", "word ".repeat(500))],
  })
  assert.equal(buildContextBudget(config).attention[0].relPath, "big.md")
})
