import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  appendLine,
  applyFixes,
  insertFrontmatterField,
  prependFrontmatter,
} from "./fix.js"
import type { Finding } from "./types.js"

test("prependFrontmatter adds a frontmatter block before the content", () => {
  const out = prependFrontmatter("# Agent\nbody", { name: "agent", description: "does things" })
  assert.equal(out, "---\nname: agent\ndescription: does things\n---\n# Agent\nbody")
})

test("insertFrontmatterField inserts right after the opening ---", () => {
  const out = insertFrontmatterField("---\nname: a\n---\n# X", "description", "d")
  assert.equal(out, "---\ndescription: d\nname: a\n---\n# X")
})

test("appendLine normalizes trailing newlines", () => {
  assert.equal(appendLine("", ".env"), ".env\n")
  assert.equal(appendLine("a\n", ".env"), "a\n.env\n")
  assert.equal(appendLine("a", ".env"), "a\n.env\n")
})

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "aic-fix-"))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function fixFinding(relPath: string, line: string): Finding {
  return {
    level: "WARN",
    message: `add ${line}`,
    fix: { relPath, description: `add ${line} to ${relPath}`, apply: (c) => appendLine(c, line) },
  }
}

test("applyFixes creates a missing file and reports what it did", () => {
  const applied = applyFixes(root, [fixFinding(".gitignore", ".env")])
  assert.equal(readFileSync(join(root, ".gitignore"), "utf8"), ".env\n")
  assert.deepEqual(applied, [{ relPath: ".gitignore", description: "add .env to .gitignore" }])
})

test("applyFixes chains multiple fixes on the same file", () => {
  writeFileSync(join(root, ".gitignore"), "node_modules\n")
  applyFixes(root, [fixFinding(".gitignore", ".env"), fixFinding(".gitignore", "dist")])
  assert.equal(readFileSync(join(root, ".gitignore"), "utf8"), "node_modules\n.env\ndist\n")
})

test("applyFixes with dryRun does not write", () => {
  const applied = applyFixes(root, [fixFinding(".gitignore", ".env")], { dryRun: true })
  assert.equal(existsSync(join(root, ".gitignore")), false)
  assert.equal(applied.length, 1)
})

test("applyFixes ignores findings without a fix", () => {
  const applied = applyFixes(root, [{ level: "ERROR", message: "no fix here" }])
  assert.equal(applied.length, 0)
})
