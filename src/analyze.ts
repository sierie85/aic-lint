import { existsSync } from "fs"
import { basename, join } from "path"
import type { Category, Finding, Fix, ProjectConfig } from "./types.js"
import { allFiles, alwaysOnFiles, markdownFiles } from "./collect.js"
import { parseFrontmatter } from "./frontmatter.js"
import { scanSecrets } from "./secrets.js"
import { estimateTokens } from "./estimate.js"
import { appendLine, insertFrontmatterField, prependFrontmatter } from "./fix.js"
import { extractFileRefs, extractH2Headings, stripCodeFences } from "./markdown.js"
import { DEFAULT_SETTINGS, DEFAULT_THRESHOLDS, type Settings, type Thresholds } from "./settings.js"

export type FileExists = (absPath: string) => boolean

// A CLAUDE.md shorter than this is too small to need ## sections.
const STRUCTURE_MIN_LINES = 20
// Skills shorter than this are too small to judge for quality.
const SKILL_MIN_LINES = 10
// Two skills sharing at least this many ## headings probably overlap.
const OVERLAP_MIN_SHARED = 2
// A duplicated line must be at least this long to count as redundancy.
const REDUNDANCY_MIN_LEN = 40
// Sensitive files that should never be committed if they exist.
const GITIGNORE_SENSITIVE = [".env", ".claude/settings.local.json"]

function finding(level: Finding["level"], message: string, fix?: Fix): Finding {
  return fix ? { level, message, fix } : { level, message }
}

export function checkAiConfigPresence(config: ProjectConfig): Finding[] {
  const hasAny =
    config.claudeMdFiles.length > 0 ||
    config.agentsMd !== null ||
    config.agentsOverrideMd !== null ||
    config.codexAgentsMd !== null ||
    config.geminiMd !== null ||
    config.cursorRules.length > 0
  return hasAny
    ? []
    : [finding("WARN", "No AI config files found (CLAUDE.md, AGENTS.md, GEMINI.md, .cursorrules)")]
}

export function checkClaudeMdLength(
  config: ProjectConfig,
  _fileExists: FileExists = existsSync,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Finding[] {
  return config.claudeMdFiles.flatMap((file) => {
    const note = `${file.relPath}: ${file.lineCount} lines, ~${estimateTokens(file.content)} tokens (recommended: < ${thresholds.claudeMdWarnLines} lines)`
    if (file.lineCount > thresholds.claudeMdErrorLines) return [finding("ERROR", note)]
    if (file.lineCount > thresholds.claudeMdWarnLines) return [finding("WARN", note)]
    return []
  })
}

export function checkDeadRefs(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  return markdownFiles(config).flatMap((file) =>
    extractFileRefs(file.content)
      .filter((ref) => !fileExists(join(config.root, ref)))
      .map((ref) => finding("ERROR", `Dead path in ${file.relPath}: \`${ref}\``)),
  )
}

export function checkClaudeMdStructure(config: ProjectConfig): Finding[] {
  return config.claudeMdFiles
    .filter((file) => file.lineCount > STRUCTURE_MIN_LINES && !/^## /m.test(file.content))
    .map((file) => finding("WARN", `${file.relPath}: unstructured content (no ## section)`))
}

export function checkSkillQuality(config: ProjectConfig): Finding[] {
  return config.skills
    .filter((skill) => {
      if (skill.lineCount <= SKILL_MIN_LINES) return false
      const hasH1 = /^# .+/m.test(skill.content)
      const prose = stripCodeFences(skill.content).replace(/`[^`]+`/g, "")
      const proseLines = prose.split("\n").filter((l) => l.trim() && !l.startsWith("#"))
      return !hasH1 || proseLines.length < 2
    })
    .map((skill) => finding("WARN", `Skill ${skill.relPath}: no title or no descriptive text`))
}

export function checkSkillOverlap(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  const headings = config.skills.map((s) => extractH2Headings(s.content))
  for (let i = 0; i < config.skills.length; i++) {
    for (let j = i + 1; j < config.skills.length; j++) {
      const shared = [...headings[i]].filter((h) => headings[j].has(h))
      if (shared.length >= OVERLAP_MIN_SHARED) {
        const sections = shared.sort().map((h) => `"${h}"`).join(", ")
        const where = `${config.skills[i].relPath} + ${config.skills[j].relPath}`
        findings.push(finding("WARN", `Skill overlap: ${where} share: ${sections}`))
      }
    }
  }
  return findings
}

export function checkRedundancy(config: ProjectConfig): Finding[] {
  // Map each normalized content line to the set of files it appears in.
  const filesByLine = new Map<string, Set<string>>()
  for (const file of [...config.claudeMdFiles, ...config.skills]) {
    let inFence = false
    for (const raw of file.content.split("\n")) {
      const line = raw.trim()
      if (line.startsWith("```")) {
        inFence = !inFence
        continue
      }
      if (inFence || line.startsWith("#")) continue
      const norm = line.toLowerCase().replace(/\s+/g, " ")
      if (norm.length < REDUNDANCY_MIN_LEN) continue
      if (!filesByLine.has(norm)) filesByLine.set(norm, new Set())
      filesByLine.get(norm)!.add(file.relPath)
    }
  }

  const findings: Finding[] = []
  for (const [norm, paths] of filesByLine) {
    if (paths.size < 2) continue
    const where = [...paths].sort().join(" + ")
    const preview = norm.length > 60 ? `${norm.slice(0, 60)}…` : norm
    const wasted = estimateTokens(norm) * (paths.size - 1)
    findings.push(finding("WARN", `Redundancy in ${where}: "${preview}" (~${wasted} tokens duplicated)`))
  }
  return findings
}

export function checkFrontmatter(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []

  for (const skill of config.skills) {
    const fm = parseFrontmatter(skill.content)
    if (fm.present && !fm.valid) {
      findings.push(finding("WARN", `${skill.relPath}: frontmatter not closed (--- missing)`))
    } else if (fm.present && fm.valid && !fm.fields.description) {
      findings.push(finding("INFO", `${skill.relPath}: frontmatter without 'description'`, {
        relPath: skill.relPath,
        description: `Add a placeholder 'description' to ${skill.relPath}`,
        apply: (c) => insertFrontmatterField(c, "description", "TODO: describe this command"),
      }))
    }
  }

  for (const agent of config.agents) {
    const fm = parseFrontmatter(agent.content)
    if (!fm.present) {
      findings.push(finding("WARN", `${agent.relPath}: agent without frontmatter (name/description required)`, {
        relPath: agent.relPath,
        description: `Scaffold frontmatter in ${agent.relPath}`,
        apply: (c) => prependFrontmatter(c, { name: basename(agent.relPath, ".md"), description: "TODO: describe this agent" }),
      }))
      continue
    }
    if (!fm.valid) {
      findings.push(finding("WARN", `${agent.relPath}: frontmatter not closed (--- missing)`))
      continue
    }
    for (const key of ["name", "description"]) {
      if (!fm.fields[key]) {
        const value = key === "name" ? basename(agent.relPath, ".md") : "TODO: describe this agent"
        findings.push(finding("WARN", `${agent.relPath}: agent frontmatter without '${key}'`, {
          relPath: agent.relPath,
          description: `Add '${key}' to frontmatter in ${agent.relPath}`,
          apply: (c) => insertFrontmatterField(c, key, value),
        }))
      }
    }
  }

  return findings
}

export function checkJsonConfigs(config: ProjectConfig): Finding[] {
  return config.jsonConfigs.flatMap((file) => {
    try {
      JSON.parse(file.content)
      return []
    } catch (e) {
      return [finding("ERROR", `${file.relPath}: invalid JSON (${(e as Error).message})`)]
    }
  })
}

function isGitignored(entry: string, patterns: Set<string>): boolean {
  if (patterns.has(entry) || patterns.has(`/${entry}`)) return true
  const base = entry.split("/").pop()!
  if (patterns.has(base) || patterns.has(`/${base}`)) return true
  // A directory pattern (e.g. ".claude/" or "/.claude") covers everything under it.
  for (const p of patterns) {
    const dir = p.replace(/^\//, "").replace(/\/$/, "")
    if (dir && entry.startsWith(`${dir}/`)) return true
  }
  return false
}

export function checkGitignore(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  const patterns = new Set(
    (config.gitignore?.content ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
  )
  return GITIGNORE_SENSITIVE
    .filter((entry) => fileExists(join(config.root, entry)) && !isGitignored(entry, patterns))
    .map((entry) =>
      finding("WARN", `${entry} exists but is not in .gitignore`, {
        relPath: ".gitignore",
        description: `Add ${entry} to .gitignore`,
        apply: (c) => appendLine(c, entry),
      }),
    )
}

export function checkContextBudget(
  config: ProjectConfig,
  _fileExists: FileExists = existsSync,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Finding[] {
  const alwaysOn = alwaysOnFiles(config).map((f) => ({ relPath: f.relPath, tokens: estimateTokens(f.content) }))
  const total = alwaysOn.reduce((a, f) => a + f.tokens, 0)
  if (total <= thresholds.alwaysOnWarnTokens) return []

  const heaviest = alwaysOn.reduce((a, b) => (b.tokens > a.tokens ? b : a))
  const hint = `loaded every session — consider moving detail into on-demand skills/docs (heaviest: ${heaviest.relPath} ~${heaviest.tokens} tokens)`
  const level = total > thresholds.alwaysOnErrorTokens ? "ERROR" : "WARN"
  return [finding(level, `Always-on context ~${total} tokens exceeds the recommended ${thresholds.alwaysOnWarnTokens} (${hint})`)]
}

export function checkSecrets(config: ProjectConfig): Finding[] {
  return allFiles(config).flatMap((file) =>
    scanSecrets(file.content).map((m) =>
      finding("ERROR", `Possible secret in ${file.relPath}: ${m.kind} (${m.snippet})`),
    ),
  )
}

interface CheckEntry {
  id: string
  check: (config: ProjectConfig, fileExists: FileExists, thresholds: Thresholds) => Finding[]
  category: Category
}

// The full check suite, in report order. Each check has a stable `id` (used in
// .aiclintrc.json) and is tagged with the score dimension it contributes to.
const CHECKS: CheckEntry[] = [
  { id: "ai-config-presence", check: checkAiConfigPresence, category: "structure" },
  { id: "claude-md-length", check: checkClaudeMdLength, category: "efficiency" },
  { id: "dead-references", check: checkDeadRefs, category: "maintainability" },
  { id: "claude-md-structure", check: checkClaudeMdStructure, category: "structure" },
  { id: "skill-quality", check: checkSkillQuality, category: "structure" },
  { id: "skill-overlap", check: checkSkillOverlap, category: "maintainability" },
  { id: "redundancy", check: checkRedundancy, category: "efficiency" },
  { id: "context-budget", check: checkContextBudget, category: "efficiency" },
  { id: "frontmatter", check: checkFrontmatter, category: "structure" },
  { id: "json-configs", check: checkJsonConfigs, category: "validity" },
  { id: "gitignore", check: checkGitignore, category: "security" },
  { id: "secrets", check: checkSecrets, category: "security" },
]

const RULE_TO_LEVEL: Record<"info" | "warn" | "error", Finding["level"]> = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
}

export function analyze(
  config: ProjectConfig,
  fileExists: FileExists = existsSync,
  settings: Settings = DEFAULT_SETTINGS,
): Finding[] {
  return CHECKS.flatMap(({ id, check, category }) => {
    const rule = settings.rules[id]
    if (rule === "off") return []
    return check(config, fileExists, settings.thresholds).map((f) => ({
      ...f,
      category,
      level: rule ? RULE_TO_LEVEL[rule] : f.level,
    }))
  })
}
