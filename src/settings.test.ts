import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { DEFAULT_SETTINGS, DEFAULT_THRESHOLDS, loadSettings } from "./settings.js"

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "aic-cfg-"))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function writeConfig(content: string) {
  writeFileSync(join(root, ".aiclintrc.json"), content)
}

test("loadSettings returns defaults when no config file exists", () => {
  assert.deepEqual(loadSettings(root), DEFAULT_SETTINGS)
})

test("loadSettings reads rules and merges thresholds over defaults", () => {
  writeConfig(JSON.stringify({ rules: { redundancy: "off", "dead-references": "warn" }, thresholds: { alwaysOnWarnTokens: 5000 } }))
  const settings = loadSettings(root)
  assert.equal(settings.rules.redundancy, "off")
  assert.equal(settings.rules["dead-references"], "warn")
  assert.equal(settings.thresholds.alwaysOnWarnTokens, 5000)
  // unspecified thresholds keep their defaults
  assert.equal(settings.thresholds.claudeMdWarnLines, DEFAULT_THRESHOLDS.claudeMdWarnLines)
})

test("loadSettings ignores invalid rule values and non-numeric thresholds", () => {
  writeConfig(JSON.stringify({ rules: { redundancy: "loud" }, thresholds: { alwaysOnWarnTokens: "lots" } }))
  const settings = loadSettings(root)
  assert.equal(settings.rules.redundancy, undefined)
  assert.equal(settings.thresholds.alwaysOnWarnTokens, DEFAULT_THRESHOLDS.alwaysOnWarnTokens)
})

test("loadSettings falls back to defaults on invalid JSON", () => {
  writeConfig("{ not valid json")
  assert.deepEqual(loadSettings(root), DEFAULT_SETTINGS)
})
