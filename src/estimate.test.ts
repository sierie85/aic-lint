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

test("buildContextBudget includes CLAUDE.md, skills and AGENTS.md", () => {
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", "some content here with several words")],
    skills: [cf("audit.md", "skill content here")],
    agentsMd: cf("AGENTS.md", "codex instructions here"),
  })
  const budget = buildContextBudget(config)
  assert.ok("CLAUDE.md" in budget.files)
  assert.ok("audit.md" in budget.files)
  assert.ok("AGENTS.md" in budget.files)
  assert.equal(budget.totalEstimatedTokens, Object.values(budget.files).reduce((a, b) => a + b, 0))
})

test("buildContextBudget handles an empty project", () => {
  const budget = buildContextBudget(makeConfig())
  assert.deepEqual(budget.files, {})
  assert.equal(budget.totalEstimatedTokens, 0)
})
