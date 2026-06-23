import { test } from "node:test"
import assert from "node:assert/strict"
import { extractFileRefs, extractH2Headings, stripCodeFences } from "./markdown.js"

test("extractFileRefs picks up backtick paths and md links, skips urls/globs", () => {
  const text = "Siehe `src/foo.ts` und [doc](docs/bar.md), nicht `https://x.com/a.ts` oder `src/*.ts`"
  assert.deepEqual(extractFileRefs(text).sort(), ["docs/bar.md", "src/foo.ts"])
})

test("extractFileRefs ignores backtick words without a known extension", () => {
  assert.deepEqual(extractFileRefs("benutze `npm install` und `someVar`"), [])
})

test("extractFileRefs ignores bare filenames in inline code (only paths count)", () => {
  assert.deepEqual(extractFileRefs("prüft `settings.json` und `.mcp.json`"), [])
  assert.deepEqual(extractFileRefs("siehe `.claude/settings.json`"), [".claude/settings.json"])
})

test("extractFileRefs skips protocol links like mailto:", () => {
  assert.deepEqual(extractFileRefs("[mail](mailto:foo@bar.de) und [x](tel:123)"), [])
})

test("extractH2Headings returns trimmed h2 set", () => {
  const set = extractH2Headings("# Titel\n## Eins \n### Drei\n## Zwei")
  assert.deepEqual([...set].sort(), ["Eins", "Zwei"])
})

test("stripCodeFences removes fenced blocks", () => {
  assert.equal(stripCodeFences("a\n```\ncode\n```\nb").trim(), "a\n\nb".trim())
})
