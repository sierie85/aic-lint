import { existsSync } from "fs"
import { basename, join } from "path"
import type { Finding, Fix, ProjectConfig } from "./types.js"
import { allFiles, markdownFiles } from "./collect.js"
import { parseFrontmatter } from "./frontmatter.js"
import { scanSecrets } from "./secrets.js"
import { appendLine, insertFrontmatterField, prependFrontmatter } from "./fix.js"
import { extractFileRefs, extractH2Headings, stripCodeFences } from "./markdown.js"

export type FileExists = (absPath: string) => boolean

// CLAUDE.md is loaded into context on every session, so longer files cost more.
const CLAUDE_MD_WARN_LINES = 80
const CLAUDE_MD_ERROR_LINES = 150
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
    config.geminiMd !== null
  return hasAny
    ? []
    : [finding("WARN", "No AI config files found (CLAUDE.md, AGENTS.md, GEMINI.md)")]
}

export function checkClaudeMdLength(config: ProjectConfig): Finding[] {
  return config.claudeMdFiles.flatMap((file) => {
    const note = `${file.relPath}: ${file.lineCount} lines (recommended: < ${CLAUDE_MD_WARN_LINES})`
    if (file.lineCount > CLAUDE_MD_ERROR_LINES) return [finding("ERROR", note)]
    if (file.lineCount > CLAUDE_MD_WARN_LINES) return [finding("WARN", note)]
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
    findings.push(finding("WARN", `Redundancy in ${where}: "${preview}"`))
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
  return patterns.has(base) || patterns.has(`/${base}`)
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

export function checkSecrets(config: ProjectConfig): Finding[] {
  return allFiles(config).flatMap((file) =>
    scanSecrets(file.content).map((m) =>
      finding("ERROR", `Possible secret in ${file.relPath}: ${m.kind} (${m.snippet})`),
    ),
  )
}

// The full check suite, in report order. Add or remove a check here.
const CHECKS: ((config: ProjectConfig, fileExists: FileExists) => Finding[])[] = [
  checkAiConfigPresence,
  checkClaudeMdLength,
  checkDeadRefs,
  checkClaudeMdStructure,
  checkSkillQuality,
  checkSkillOverlap,
  checkRedundancy,
  checkFrontmatter,
  checkJsonConfigs,
  checkGitignore,
  checkSecrets,
]

export function analyze(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  return CHECKS.flatMap((check) => check(config, fileExists))
}
