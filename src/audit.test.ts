import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { runAudit, toMarkdown } from "./audit.js"

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "audit-run-"))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function write(relPath: string, content = "x") {
  const full = join(root, relPath)
  mkdirSync(join(full, ".."), { recursive: true })
  writeFileSync(full, content)
}

test("runAudit returns findings and hasErrors=false for a clean small project", () => {
  write("CLAUDE.md", "## Setup\n\nKurz und strukturiert.")
  const result = runAudit(root, { noBudget: true })
  assert.equal(result.hasErrors, false)
  assert.ok(Array.isArray(result.findings))
  assert.equal(result.budget, undefined)
})

test("runAudit flags hasErrors=true when an oversized CLAUDE.md exists", () => {
  const big = Array.from({ length: 200 }, (_, i) => `Zeile ${i}`).join("\n")
  write("CLAUDE.md", big)
  assert.equal(runAudit(root, { noBudget: true }).hasErrors, true)
})

test("runAudit includes a context budget by default", () => {
  write("CLAUDE.md", "## A\n\ntext")
  const result = runAudit(root)
  assert.ok(result.budget)
  assert.ok(result.budget!.totalEstimatedTokens > 0)
})

test("toMarkdown renders the budget table from the result", () => {
  write("CLAUDE.md", "## A\n\ntext")
  const md = toMarkdown(runAudit(root))
  assert.match(md, /Context-Budget/)
  assert.match(md, /\| CLAUDE\.md \(CLAUDE\.md\) \|/)
})

test("runAudit reports invalid JSON config as an error", () => {
  write("CLAUDE.md", "## A\n\ntext")
  write(".claude/settings.json", "{ not valid json ")
  const result = runAudit(root, { noBudget: true })
  assert.equal(result.hasErrors, true)
  assert.ok(result.findings.some((f) => /settings\.json.*ungültiges JSON/.test(f.message)))
})
