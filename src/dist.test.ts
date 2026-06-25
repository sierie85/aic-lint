import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"

// Guards the *packaging* layer that unit tests otherwise miss. The shipped
// bin must be runnable (shebang + executable bit), or the installed `aic-lint`
// fails with "Permission denied". dist/ is built on demand (not committed), so
// the dist checks only run when a build is present; the source check always runs.
const SHEBANG = "#!/usr/bin/env node"

test("src/index.ts starts with the node shebang", () => {
  const src = fileURLToPath(new URL("./index.ts", import.meta.url))
  assert.equal(readFileSync(src, "utf8").split("\n", 1)[0], SHEBANG)
})

test("a built dist/index.js is a runnable bin (shebang + executable bit)", () => {
  const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url))
  if (!existsSync(entry)) return // no build present — nothing to guard
  assert.equal(readFileSync(entry, "utf8").split("\n", 1)[0], SHEBANG)
  assert.ok(statSync(entry).mode & 0o100, "owner-execute bit must be set on dist/index.js")
})
