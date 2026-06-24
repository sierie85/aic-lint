import { test } from "node:test"
import assert from "node:assert/strict"
import { computeScore } from "./score.js"
import type { Finding } from "./types.js"

test("an empty project scores a perfect 100 / A", () => {
  const score = computeScore([])
  assert.equal(score.overall, 100)
  assert.equal(score.grade, "A")
  assert.deepEqual(score.dimensions, {
    security: 100,
    structure: 100,
    maintainability: 100,
    validity: 100,
  })
})

test("a security ERROR lowers the security dimension and the overall score", () => {
  const findings: Finding[] = [{ level: "ERROR", message: "leaked key", category: "security" }]
  const score = computeScore(findings)
  assert.equal(score.dimensions.security, 75)
  assert.equal(score.dimensions.structure, 100)
  assert.ok(score.overall < 100)
})

test("penalties stack and clamp at 0 per dimension", () => {
  const findings: Finding[] = Array.from({ length: 10 }, () => ({
    level: "ERROR" as const,
    message: "x",
    category: "validity" as const,
  }))
  assert.equal(computeScore(findings).dimensions.validity, 0)
})

test("severity weights differ: WARN and INFO deduct less than ERROR", () => {
  const warn = computeScore([{ level: "WARN", message: "w", category: "structure" }])
  const info = computeScore([{ level: "INFO", message: "i", category: "structure" }])
  assert.equal(warn.dimensions.structure, 92)
  assert.equal(info.dimensions.structure, 98)
})

test("findings without a category fall back to maintainability", () => {
  const score = computeScore([{ level: "ERROR", message: "x" }])
  assert.equal(score.dimensions.maintainability, 75)
  assert.equal(score.dimensions.structure, 100)
})

test("grade thresholds map correctly", () => {
  // 4 ERRORs in validity → validity 0; overall = round(100*.35+100*.25+100*.25+0*.15)=85 → B
  assert.equal(computeScore(Array.from({ length: 4 }, () => ({ level: "ERROR" as const, message: "x", category: "validity" as const }))).grade, "B")
})
