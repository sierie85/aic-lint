import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"

// Guards the *packaging* layer that unit tests otherwise miss: the committed
// dist/index.js must be a runnable bin (correct shebang + executable bit), or
// `npm i -g github:...` links a bin that the OS refuses to exec ("Permission
// denied" / "command not found"). This is what bit us in real installs.
const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url))

test("dist/index.js starts with a node shebang", () => {
  const first = readFileSync(entry, "utf8").split("\n", 1)[0]
  assert.equal(first, "#!/usr/bin/env node")
})

test("dist/index.js has the executable bit set (so the bin runs)", () => {
  const mode = statSync(entry).mode
  assert.ok(mode & 0o100, "owner-execute bit must be set on dist/index.js")
})
