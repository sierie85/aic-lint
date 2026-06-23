import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { collect } from "./collect.js"

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "audit-test-"))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function write(relPath: string, content = "x") {
  const full = join(root, relPath)
  mkdirSync(join(full, ".."), { recursive: true })
  writeFileSync(full, content)
}

test("collect finds CLAUDE.md at root and in nested dirs", () => {
  write("CLAUDE.md", "root")
  write("src/CLAUDE.md", "nested")
  const config = collect(root)
  assert.equal(config.claudeMdFiles.length, 2)
  assert.deepEqual(config.claudeMdFiles.map((f) => f.relPath).sort(), ["CLAUDE.md", "src/CLAUDE.md"])
})

test("collect reads skills from .claude/commands", () => {
  write(".claude/commands/audit.md", "# audit")
  write(".claude/commands/other.md", "# other")
  const config = collect(root)
  assert.deepEqual(config.skills.map((s) => s.relPath).sort(), [
    join(".claude", "commands", "audit.md"),
    join(".claude", "commands", "other.md"),
  ])
})

test("collect detects AGENTS.md, GEMINI.md and docs/ai", () => {
  write("AGENTS.md")
  write("GEMINI.md")
  write("docs/ai/overview.md")
  const config = collect(root)
  assert.ok(config.agentsMd)
  assert.ok(config.geminiMd)
  assert.equal(config.aiDocs.length, 1)
})

test("collect does not recurse into node_modules or dist", () => {
  write("CLAUDE.md", "root")
  write("node_modules/some-pkg/CLAUDE.md", "fremd")
  write("dist/CLAUDE.md", "build-artefakt")
  const config = collect(root)
  assert.deepEqual(config.claudeMdFiles.map((f) => f.relPath), ["CLAUDE.md"])
})

test("collect reads agents and json config files", () => {
  write(".claude/agents/helper.md", "# helper")
  write(".claude/settings.json", "{}")
  write(".claude/settings.local.json", "{}")
  write(".mcp.json", "{}")
  const config = collect(root)
  assert.equal(config.agents.length, 1)
  assert.deepEqual(
    config.jsonConfigs.map((f) => f.relPath).sort(),
    [join(".claude", "settings.json"), join(".claude", "settings.local.json"), ".mcp.json"].sort(),
  )
})

test("collect on empty dir returns empty collections", () => {
  const config = collect(root)
  assert.equal(config.claudeMdFiles.length, 0)
  assert.equal(config.skills.length, 0)
  assert.equal(config.agents.length, 0)
  assert.equal(config.agentsMd, null)
  assert.equal(config.geminiMd, null)
  assert.equal(config.aiDocs.length, 0)
  assert.equal(config.jsonConfigs.length, 0)
})

test("collect computes lineCount", () => {
  write("CLAUDE.md", "a\nb\nc")
  assert.equal(collect(root).claudeMdFiles[0].lineCount, 3)
})
