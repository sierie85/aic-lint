import { test } from "node:test"
import assert from "node:assert/strict"
import { scanSecrets } from "./secrets.js"

test("detects an Anthropic API key and redacts it", () => {
  const matches = scanSecrets("key = sk-ant-api03-abc123def456ghi789jkl0mno")
  assert.equal(matches.length, 1)
  assert.equal(matches[0].kind, "Anthropic API Key")
  assert.doesNotMatch(matches[0].snippet, /abc123def456/)
  assert.match(matches[0].snippet, /…/)
})

test("detects AWS access keys and GitHub tokens", () => {
  assert.equal(scanSecrets("AKIAIOSFODNN7EXAMPLE")[0].kind, "AWS Access Key")
  assert.equal(scanSecrets(`token ghp_${"a".repeat(36)}`)[0].kind, "GitHub Token")
})

test("detects private key headers", () => {
  assert.equal(scanSecrets("-----BEGIN OPENSSH PRIVATE KEY-----")[0].kind, "Private Key")
})

test("returns nothing for clean text", () => {
  assert.deepEqual(scanSecrets("ganz normaler Text ohne Geheimnisse"), [])
})
