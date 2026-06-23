import { test } from "node:test"
import assert from "node:assert/strict"
import { buildContextBudget, estimateTokens } from "./estimate.js"
import { cf, makeConfig } from "./testutil.js"

test("estimateTokens returns 0 for empty text", () => {
  assert.equal(estimateTokens(""), 0)
})

test("estimateTokens grows with text length", () => {
  const short = estimateTokens("hallo welt")
  const long = estimateTokens("hallo welt ".repeat(50))
  assert.ok(long > short)
  assert.ok(short > 0)
})

test("buildContextBudget keys estimates per relPath and sums total", () => {
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", "ein laengerer Text mit mehreren Woertern hier")],
    skills: [cf("audit.md", "Skill Inhalt mit Text")],
  })
  const budget = buildContextBudget(config)
  assert.ok("CLAUDE.md" in budget.claudeMdFiles)
  assert.ok("audit.md" in budget.skills)
  const expected =
    Object.values(budget.claudeMdFiles).reduce((a, b) => a + b, 0) +
    Object.values(budget.skills).reduce((a, b) => a + b, 0)
  assert.equal(budget.totalEstimatedTokens, expected)
})

test("buildContextBudget handles an empty project", () => {
  const budget = buildContextBudget(makeConfig())
  assert.deepEqual(budget.claudeMdFiles, {})
  assert.equal(budget.totalEstimatedTokens, 0)
})
