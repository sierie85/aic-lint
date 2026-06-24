import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { CLAUDE_AUDIT_COMMAND, CODEX_AUDIT_PROMPT, runInit } from "./init.js"

let home: string
let cwd: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "aic-home-"))
  cwd = mkdtempSync(join(tmpdir(), "aic-cwd-"))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
  rmSync(cwd, { recursive: true, force: true })
})

test("auto-detect with no tool homes defaults to Claude at user level", () => {
  const { written } = runInit({ homeDir: home, cwd })
  assert.deepEqual(written.map((w) => w.target), ["claude"])
  assert.equal(written[0].path, join(home, ".claude", "commands", "audit.md"))
  assert.equal(readFileSync(written[0].path, "utf8"), CLAUDE_AUDIT_COMMAND)
})

test("auto-detect installs to Codex when ~/.codex exists", () => {
  mkdirSync(join(home, ".codex"), { recursive: true })
  const { written } = runInit({ homeDir: home, cwd })
  assert.deepEqual(written.map((w) => w.target), ["codex"])
  assert.equal(written[0].path, join(home, ".codex", "prompts", "audit.md"))
  assert.equal(readFileSync(written[0].path, "utf8"), CODEX_AUDIT_PROMPT)
})

test("auto-detect installs to both when both tool homes exist", () => {
  mkdirSync(join(home, ".claude"), { recursive: true })
  mkdirSync(join(home, ".codex"), { recursive: true })
  const { written } = runInit({ homeDir: home, cwd })
  assert.deepEqual(written.map((w) => w.target).sort(), ["claude", "codex"])
})

test("explicit targets override detection", () => {
  const { written } = runInit({ homeDir: home, cwd, targets: ["codex"] })
  assert.deepEqual(written.map((w) => w.target), ["codex"])
})

test("--project installs the Claude command into the current repo", () => {
  const { written } = runInit({ homeDir: home, cwd, targets: ["claude"], project: true })
  assert.equal(written[0].path, join(cwd, ".claude", "commands", "audit.md"))
})

test("Codex prompt stays user-level even with --project", () => {
  const { written } = runInit({ homeDir: home, cwd, targets: ["codex"], project: true })
  assert.equal(written[0].path, join(home, ".codex", "prompts", "audit.md"))
})

test("duplicate targets are de-duplicated", () => {
  const { written } = runInit({ homeDir: home, cwd, targets: ["claude", "claude"] })
  assert.equal(written.length, 1)
})

test("CLAUDE_AUDIT_COMMAND matches the committed .claude/commands/audit.md (no drift)", () => {
  const committed = readFileSync(new URL("../.claude/commands/audit.md", import.meta.url), "utf8")
  assert.equal(committed, CLAUDE_AUDIT_COMMAND)
})
