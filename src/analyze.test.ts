import { test } from "node:test"
import assert from "node:assert/strict"
import {
  analyze,
  checkAiConfigPresence,
  checkClaudeMdLength,
  checkContextBudget,
  checkClaudeMdStructure,
  checkDeadRefs,
  checkFrontmatter,
  checkGitignore,
  checkJsonConfigs,
  checkRedundancy,
  checkSecrets,
  checkSkillOverlap,
  checkSkillQuality,
} from "./analyze.js"
import { cf, lines, makeConfig } from "./testutil.js"
import { DEFAULT_THRESHOLDS, type Settings } from "./settings.js"

test("checkAiConfigPresence warns when no AI config files present", () => {
  assert.equal(checkAiConfigPresence(makeConfig()).length, 1)
  assert.equal(checkAiConfigPresence(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "x")] })).length, 0)
  assert.equal(checkAiConfigPresence(makeConfig({ agentsMd: cf("AGENTS.md", "x") })).length, 0)
  assert.equal(checkAiConfigPresence(makeConfig({ geminiMd: cf("GEMINI.md", "x") })).length, 0)
  assert.equal(checkAiConfigPresence(makeConfig({ cursorRules: [cf(".cursorrules", "x")] })).length, 0)
})

test("checkClaudeMdLength: error above 150, warn above 80, ok below", () => {
  assert.equal(checkClaudeMdLength(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(160))] }))[0].level, "ERROR")
  assert.equal(checkClaudeMdLength(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(90))] }))[0].level, "WARN")
  assert.equal(checkClaudeMdLength(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(40))] })).length, 0)
})

test("checkDeadRefs flags refs that do not exist (injected fileExists)", () => {
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "see `src/missing.ts` and `src/here.ts`")] })
  const exists = (p: string) => p.endsWith("here.ts")
  const findings = checkDeadRefs(config, exists)
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /missing\.ts/)
})

test("checkDeadRefs also scans GEMINI.md, docs/ai and Cursor rules", () => {
  const config = makeConfig({
    geminiMd: cf("GEMINI.md", "see `src/gone.ts`"),
    aiDocs: [cf("docs/ai/x.md", "see `docs/missing.md`")],
    cursorRules: [cf(".cursor/rules/main.mdc", "see `src/nope.ts`")],
  })
  const findings = checkDeadRefs(config, () => false)
  assert.equal(findings.length, 3)
})

test("checkClaudeMdStructure warns on long unstructured file, ignores short", () => {
  assert.equal(checkClaudeMdStructure(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(25))] })).length, 1)
  assert.equal(checkClaudeMdStructure(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(10))] })).length, 0)
  assert.equal(checkClaudeMdStructure(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "## A\n" + lines(25))] })).length, 0)
})

test("checkSkillQuality warns on skill without prose, accepts well-formed skill", () => {
  const bad = cf("s.md", "# Title\n" + "```\ncode\n```\n".repeat(5))
  assert.equal(checkSkillQuality(makeConfig({ skills: [bad] })).length, 1)
  const good = cf("s.md", "# Title\n\nThis is a skill.\nIt does something useful.\n" + lines(8))
  assert.equal(checkSkillQuality(makeConfig({ skills: [good] })).length, 0)
})

test("checkSkillOverlap warns when two skills share >=2 h2 headings", () => {
  const a = cf("a.md", "## Usage\n## Example\n## Only A")
  const b = cf("b.md", "## Usage\n## Example\n## Only B")
  const findings = checkSkillOverlap(makeConfig({ skills: [a, b] }))
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /"Example", "Usage"/)
})

test("checkSkillOverlap ignores a single shared heading", () => {
  const a = cf("a.md", "## Usage\n## Only A")
  const b = cf("b.md", "## Usage\n## Only B")
  assert.equal(checkSkillOverlap(makeConfig({ skills: [a, b] })).length, 0)
})

test("checkRedundancy flags a long line shared across two files", () => {
  const shared = "This is a sufficiently long shared line used for testing."
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", `# Title\n${shared}`)],
    skills: [cf("s.md", `# Skill\n${shared}`)],
  })
  const findings = checkRedundancy(config)
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /CLAUDE\.md \+ s\.md/)
  assert.match(findings[0].message, /tokens duplicated/)
})

test("checkRedundancy ignores short lines and code fences", () => {
  const config = makeConfig({
    claudeMdFiles: [cf("CLAUDE.md", "short\n```\nidentical code block long enough in here\n```")],
    skills: [cf("s.md", "short\n```\nidentical code block long enough in here\n```")],
  })
  assert.equal(checkRedundancy(config).length, 0)
})

test("checkFrontmatter: agent without frontmatter warns, complete agent passes", () => {
  const bad = cf("a.md", "# Agent\njust prose")
  assert.equal(checkFrontmatter(makeConfig({ agents: [bad] }))[0].level, "WARN")
  const good = cf("a.md", "---\nname: helper\ndescription: helps\n---\n# Agent")
  assert.equal(checkFrontmatter(makeConfig({ agents: [good] })).length, 0)
})

test("checkFrontmatter: command without description gives info", () => {
  const skill = cf("c.md", "---\nname: foo\n---\n# Command")
  const findings = checkFrontmatter(makeConfig({ skills: [skill] }))
  assert.equal(findings[0].level, "INFO")
})

test("checkFrontmatter attaches a frontmatter-scaffold fix for an agent without frontmatter", () => {
  const finding = checkFrontmatter(makeConfig({ agents: [cf("helper.md", "# Agent\nprose")] }))[0]
  assert.ok(finding.fix)
  assert.equal(finding.fix!.relPath, "helper.md")
  assert.match(finding.fix!.apply("# Agent\nprose"), /^---\nname: helper\ndescription: /)
})

test("checkGitignore flags an existing sensitive file that is not ignored, with a fix", () => {
  const config = makeConfig({ root: "/proj", gitignore: cf(".gitignore", "node_modules\n") })
  const exists = (p: string) => p.endsWith(".env")
  const findings = checkGitignore(config, exists)
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /\.env exists but is not in \.gitignore/)
  assert.equal(findings[0].fix!.relPath, ".gitignore")
  assert.equal(findings[0].fix!.apply("node_modules\n"), "node_modules\n.env\n")
})

test("checkGitignore stays silent when the sensitive file is already ignored", () => {
  const config = makeConfig({ root: "/proj", gitignore: cf(".gitignore", ".env\n") })
  assert.equal(checkGitignore(config, (p) => p.endsWith(".env")).length, 0)
})

test("checkGitignore stays silent when the sensitive file does not exist", () => {
  const config = makeConfig({ root: "/proj", gitignore: cf(".gitignore", "") })
  assert.equal(checkGitignore(config, () => false).length, 0)
})

test("checkGitignore flags an unignored .claude/settings.local.json", () => {
  const config = makeConfig({ root: "/proj", gitignore: cf(".gitignore", "node_modules\n") })
  const findings = checkGitignore(config, (p) => p.endsWith("settings.local.json"))
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /settings\.local\.json/)
})

test("checkGitignore accepts a bare basename in .gitignore", () => {
  const config = makeConfig({ root: "/proj", gitignore: cf(".gitignore", "settings.local.json\n") })
  assert.equal(checkGitignore(config, (p) => p.endsWith("settings.local.json")).length, 0)
})

test("checkGitignore respects a directory pattern that covers the file", () => {
  const config = makeConfig({ root: "/proj", gitignore: cf(".gitignore", ".claude/\n") })
  assert.equal(checkGitignore(config, (p) => p.endsWith("settings.local.json")).length, 0)
})

test("checkGitignore warns with no .gitignore at all", () => {
  const config = makeConfig({ root: "/proj", gitignore: null })
  assert.equal(checkGitignore(config, (p) => p.endsWith(".env")).length, 1)
})

test("checkContextBudget warns when always-on context exceeds the budget", () => {
  const findings = checkContextBudget(makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "word ".repeat(7000))] }))
  assert.equal(findings.length, 1)
  assert.equal(findings[0].level, "WARN")
  assert.match(findings[0].message, /Always-on context/)
})

test("checkContextBudget errors on a very large always-on context", () => {
  const findings = checkContextBudget(makeConfig({ agentsMd: cf("AGENTS.md", "word ".repeat(13000)) }))
  assert.equal(findings[0].level, "ERROR")
})

test("checkContextBudget ignores on-demand files (a big skill does not count)", () => {
  assert.equal(checkContextBudget(makeConfig({ skills: [cf("s.md", "word ".repeat(7000))] })).length, 0)
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
  assert.ok(levels.includes("ERROR")) // length > 150
})

test("checkContextBudget honors a custom always-on token threshold", () => {
  // a small file is fine by default, but trips a low custom threshold
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "word ".repeat(200))] })
  assert.equal(checkContextBudget(config).length, 0)
  const thresholds = { ...DEFAULT_THRESHOLDS, alwaysOnWarnTokens: 100 }
  assert.equal(checkContextBudget(config, undefined, thresholds)[0].level, "WARN")
})

test("analyze: a rule set to 'off' disables that check", () => {
  const config = makeConfig({ jsonConfigs: [cf(".mcp.json", "{ broken ")] })
  assert.ok(analyze(config, () => true).some((f) => /invalid JSON/.test(f.message)))
  const settings: Settings = { rules: { "json-configs": "off" }, thresholds: DEFAULT_THRESHOLDS }
  assert.equal(analyze(config, () => true, settings).some((f) => /invalid JSON/.test(f.message)), false)
})

test("analyze: a severity override downgrades a check's findings", () => {
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", "see `src/missing.ts`")] })
  // dead-references is ERROR by default
  assert.equal(analyze(config, () => false)[0].level, "ERROR")
  const settings: Settings = { rules: { "dead-references": "warn" }, thresholds: DEFAULT_THRESHOLDS }
  const downgraded = analyze(config, () => false, settings).find((f) => /Dead path/.test(f.message))
  assert.equal(downgraded!.level, "WARN")
})

test("analyze tags every finding with a score category", () => {
  const config = makeConfig({ claudeMdFiles: [cf("CLAUDE.md", lines(160))] })
  const findings = analyze(config, () => true)
  assert.ok(findings.length > 0)
  assert.ok(findings.every((f) => f.category !== undefined))
  // an oversized CLAUDE.md is an efficiency (token-cost) concern
  assert.ok(findings.some((f) => f.category === "efficiency"))
})
