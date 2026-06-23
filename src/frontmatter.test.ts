import { test } from "node:test"
import assert from "node:assert/strict"
import { parseFrontmatter } from "./frontmatter.js"

test("parses a well-formed frontmatter block", () => {
  const fm = parseFrontmatter("---\nname: foo\ndescription: does something\n---\n# Title\ntext")
  assert.equal(fm.present, true)
  assert.equal(fm.valid, true)
  assert.equal(fm.fields.name, "foo")
  assert.equal(fm.fields.description, "does something")
})

test("reports absent frontmatter when file does not start with ---", () => {
  const fm = parseFrontmatter("# Title\ntext")
  assert.equal(fm.present, false)
  assert.equal(fm.valid, false)
})

test("reports present-but-invalid when closing --- is missing", () => {
  const fm = parseFrontmatter("---\nname: foo\n# no closing")
  assert.equal(fm.present, true)
  assert.equal(fm.valid, false)
})

test("ignores non key:value lines inside the block", () => {
  const fm = parseFrontmatter("---\nname: foo\njust prose without a colon\n---\n")
  assert.deepEqual(fm.fields, { name: "foo" })
})
