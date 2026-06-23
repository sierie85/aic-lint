import { test } from "node:test"
import assert from "node:assert/strict"
import {
  analyze,
  checkAgentsParity,
  checkAiDocs,
  checkClaudeMdLength,
  checkClaudeMdPresence,
  checkClaudeMdStructure,
  checkDeadRefs,
  checkFrontmatter,
  checkJsonConfigs,
  checkRedundancy,
  checkSecrets,
  checkSkillOverlap,
  checkSkillQuality,
} from "./analyze.js"
import { cf, lines, makeConfig } from "./testutil.js"

test("checkClaudeMdPresence warns when none present", () => {
  assert.equal(checkClaudeMdPresence(makeConfig()).length, 1)
  assert.equal(checkClaudeMdPresence(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "x")] })).length, 0)
})

test("checkClaudeMdLength: error above 150, warn above 80, ok below", () => {
  assert.equal(checkClaudeMdLength(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(160))] }))[0].level, "ERROR")
  assert.equal(checkClaudeMdLength(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(90))] }))[0].level, "WARN")
  assert.equal(checkClaudeMdLength(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(40))] })).length, 0)
})

test("checkDeadRefs flags refs that do not exist (injected fileExists)", () => {
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "siehe `src/missing.ts` und `src/here.ts`")] })
  const exists = (p: string) => p.endsWith("here.ts")
  const findings = checkDeadRefs(config, exists)
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /missing\.ts/)
})

test("checkAgentsParity: AGENTS.md without CLAUDE.md warns", () => {
  const findings = checkAgentsParity(makeConfig({ agentsMd: cf("AGENTS.md", "x") }))
  assert.equal(findings[0].level, "WARN")
})

test("checkAgentsParity: CLAUDE.md without AGENTS.md gives info", () => {
  const findings = checkAgentsParity(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "x")] }))
  assert.equal(findings[0].level, "INFO")
})

test("checkAiDocs gives info when no docs/ai present", () => {
  assert.equal(checkAiDocs(makeConfig())[0].level, "INFO")
  assert.equal(checkAiDocs(makeConfig({ aiDocs: [cf("docs/ai/x.md", "x")] })).length, 0)
})

test("checkClaudeMdStructure warns on long unstructured file, ignores short", () => {
  assert.equal(checkClaudeMdStructure(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(25))] })).length, 1)
  assert.equal(checkClaudeMdStructure(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(10))] })).length, 0)
  assert.equal(checkClaudeMdStructure(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "## A\n" + lines(25))] })).length, 0)
})

test("checkSkillQuality warns on skill without prose, accepts well-formed skill", () => {
  const bad = cf("s.md", "# Titel\n" + "```\ncode\n```\n".repeat(5))
  assert.equal(checkSkillQuality(makeConfig({ skills: [bad] })).length, 1)
  const good = cf("s.md", "# Titel\n\nDies ist ein Skill.\nEr macht etwas Nuetzliches.\n" + lines(8))
  assert.equal(checkSkillQuality(makeConfig({ skills: [good] })).length, 0)
})

test("checkSkillOverlap warns when two skills share >=2 h2 headings", () => {
  const a = cf("a.md", "## Verwendung\n## Beispiel\n## Nur A")
  const b = cf("b.md", "## Verwendung\n## Beispiel\n## Nur B")
  const findings = checkSkillOverlap(makeConfig({ skills: [a, b] }))
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /"Beispiel", "Verwendung"/)
})

test("checkSkillOverlap ignores a single shared heading", () => {
  const a = cf("a.md", "## Verwendung\n## Nur A")
  const b = cf("b.md", "## Verwendung\n## Nur B")
  assert.equal(checkSkillOverlap(makeConfig({ skills: [a, b] })).length, 0)
})

test("checkRedundancy flags a long line shared across two files", () => {
  const shared = "Dies ist eine ausreichend lange gemeinsame Zeile zum Testen."
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", `# Titel\n${shared}`)],
    skills: [cf("s.md", `# Skill\n${shared}`)],
  })
  const findings = checkRedundancy(config)
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /CLAUDE\.md \+ s\.md/)
})

test("checkRedundancy ignores short lines and code fences", () => {
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", "kurz\n```\nidentischer code block hier drin lang genug\n```")],
    skills: [cf("s.md", "kurz\n```\nidentischer code block hier drin lang genug\n```")],
  })
  assert.equal(checkRedundancy(config).length, 0)
})

test("checkFrontmatter: agent without frontmatter warns, complete agent passes", () => {
  const bad = cf("a.md", "# Agent\nnur prosa")
  assert.equal(checkFrontmatter(makeConfig({ agents: [bad] }))[0].level, "WARN")
  const good = cf("a.md", "---\nname: helper\ndescription: hilft\n---\n# Agent")
  assert.equal(checkFrontmatter(makeConfig({ agents: [good] })).length, 0)
})

test("checkFrontmatter: command without description gives info", () => {
  const skill = cf("c.md", "---\nname: foo\n---\n# Command")
  const findings = checkFrontmatter(makeConfig({ skills: [skill] }))
  assert.equal(findings[0].level, "INFO")
})

test("checkJsonConfigs flags invalid JSON", () => {
  const bad = cf(".claude/settings.json", "{ broken ")
  assert.equal(checkJsonConfigs(makeConfig({ jsonConfigs: [bad] }))[0].level, "ERROR")
  const good = cf(".claude/settings.json", '{ "ok": true }')
  assert.equal(checkJsonConfigs(makeConfig({ jsonConfigs: [good] })).length, 0)
})

test("checkSecrets flags a leaked key across collected files", () => {
  const config = makeConfig({
    jsonConfigs: [cf(".mcp.json", '{ "key": "sk-ant-api03-abcdefghij1234567890" }')],
  })
  const findings = checkSecrets(config)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].level, "ERROR")
  assert.match(findings[0].message, /Anthropic API Key/)
})

test("analyze composes all checks in order", () => {
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(160))] })
  const findings = analyze(config, () => true)
  const levels = findings.map((f) => f.level)
  assert.ok(levels.includes("ERROR")) // length
  assert.ok(levels.includes("INFO")) // no AGENTS.md + no docs/ai
})
