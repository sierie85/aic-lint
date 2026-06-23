import { test } from "node:test"
import assert from "node:assert/strict"
import { extractFileRefs, extractH2Headings, stripCodeFences } from "./markdown.js"

test("extractFileRefs picks up backtick paths and md links, skips urls/globs", () => {
  const text = "See `src/foo.ts` and [doc](docs/bar.md), not `https://x.com/a.ts` or `src/*.ts`"
  assert.deepEqual(extractFileRefs(text).sort(), ["docs/bar.md", "src/foo.ts"])
})

test("extractFileRefs ignores backtick words without a known extension", () => {
  assert.deepEqual(extractFileRefs("use `npm install` and `someVar`"), [])
})

test("extractFileRefs ignores bare filenames in inline code (only paths count)", () => {
  assert.deepEqual(extractFileRefs("checks `settings.json` and `.mcp.json`"), [])
  assert.deepEqual(extractFileRefs("see `.claude/settings.json`"), [".claude/settings.json"])
})

test("extractFileRefs skips protocol links like mailto:", () => {
  assert.deepEqual(extractFileRefs("[mail](mailto:foo@bar.de) and [x](tel:123)"), [])
})

test("extractH2Headings returns trimmed h2 set", () => {
  const set = extractH2Headings("# Title\n## One \n### Three\n## Two")
  assert.deepEqual([...set].sort(), ["One", "Two"])
})

test("stripCodeFences removes fenced blocks", () => {
  assert.equal(stripCodeFences("a\n```\ncode\n```\nb").trim(), "a\n\nb".trim())
})
