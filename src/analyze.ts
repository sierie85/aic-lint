import { existsSync } from "fs"
import { join } from "path"
import type { Finding, ProjectConfig } from "./types.js"
import { allFiles, markdownFiles } from "./collect.js"
import { parseFrontmatter } from "./frontmatter.js"
import { scanSecrets } from "./secrets.js"
import { extractFileRefs, extractH2Headings, stripCodeFences } from "./markdown.js"

export type FileExists = (absPath: string) => boolean

export function checkAiConfigPresence(config: ProjectConfig): Finding[] {
  const hasAny =
    config.claudeMdFiles.length > 0 ||
    config.agentsMd !== null ||
    config.agentsOverrideMd !== null ||
    config.codexAgentsMd !== null ||
    config.geminiMd !== null
  if (!hasAny) {
    return [{ level: "WARN", message: "No AI config files found (CLAUDE.md, AGENTS.md, GEMINI.md)" }]
  }
  return []
}

export function checkClaudeMdLength(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const f of config.claudeMdFiles) {
    if (f.lineCount > 150) {
      findings.push({ level: "ERROR", message: `${f.relPath}: ${f.lineCount} lines (recommended: < 80)` })
    } else if (f.lineCount > 80) {
      findings.push({ level: "WARN", message: `${f.relPath}: ${f.lineCount} lines (recommended: < 80)` })
    }
  }
  return findings
}

export function checkDeadRefs(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  const findings: Finding[] = []
  for (const file of markdownFiles(config)) {
    for (const ref of extractFileRefs(file.content)) {
      if (!fileExists(join(config.root, ref))) {
        findings.push({ level: "ERROR", message: `Dead path in ${file.relPath}: \`${ref}\`` })
      }
    }
  }
  return findings
}


export function checkClaudeMdStructure(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const f of config.claudeMdFiles) {
    if (f.lineCount > 20 && !/^## /m.test(f.content)) {
      findings.push({ level: "WARN", message: `${f.relPath}: unstructured content (no ## section)` })
    }
  }
  return findings
}

export function checkSkillQuality(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const skill of config.skills) {
    const hasH1 = /^# .+/m.test(skill.content)
    const prose = stripCodeFences(skill.content).replace(/`[^`]+`/g, "")
    const proseLines = prose.split("\n").filter((l) => l.trim() && !l.startsWith("#"))
    if (skill.lineCount > 10 && (!hasH1 || proseLines.length < 2)) {
      findings.push({ level: "WARN", message: `Skill ${skill.relPath}: no title or no descriptive text` })
    }
  }
  return findings
}

export function checkSkillOverlap(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  const headings = config.skills.map((s) => extractH2Headings(s.content))
  for (let i = 0; i < config.skills.length; i++) {
    for (let j = i + 1; j < config.skills.length; j++) {
      const shared = [...headings[i]].filter((h) => headings[j].has(h))
      if (shared.length >= 2) {
        const sections = shared.sort().map((h) => `"${h}"`).join(", ")
        findings.push({
          level: "WARN",
          message: `Skill overlap: ${config.skills[i].relPath} + ${config.skills[j].relPath} share: ${sections}`,
        })
      }
    }
  }
  return findings
}

export function checkRedundancy(config: ProjectConfig): Finding[] {
  const MIN_LEN = 40
  const seen = new Map<string, Set<string>>()
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
      if (norm.length < MIN_LEN) continue
      if (!seen.has(norm)) seen.set(norm, new Set())
      seen.get(norm)!.add(file.relPath)
    }
  }

  const findings: Finding[] = []
  for (const [norm, paths] of seen) {
    if (paths.size >= 2) {
      const where = [...paths].sort().join(" + ")
      const preview = norm.length > 60 ? `${norm.slice(0, 60)}…` : norm
      findings.push({ level: "WARN", message: `Redundancy in ${where}: "${preview}"` })
    }
  }
  return findings
}

export function checkFrontmatter(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []

  for (const s of config.skills) {
    const fm = parseFrontmatter(s.content)
    if (fm.present && !fm.valid) {
      findings.push({ level: "WARN", message: `${s.relPath}: frontmatter not closed (--- missing)` })
    } else if (fm.present && fm.valid && !fm.fields.description) {
      findings.push({ level: "INFO", message: `${s.relPath}: frontmatter without 'description'` })
    }
  }

  for (const a of config.agents) {
    const fm = parseFrontmatter(a.content)
    if (!fm.present) {
      findings.push({ level: "WARN", message: `${a.relPath}: agent without frontmatter (name/description required)` })
      continue
    }
    if (!fm.valid) {
      findings.push({ level: "WARN", message: `${a.relPath}: frontmatter not closed (--- missing)` })
      continue
    }
    for (const key of ["name", "description"]) {
      if (!fm.fields[key]) {
        findings.push({ level: "WARN", message: `${a.relPath}: agent frontmatter without '${key}'` })
      }
    }
  }

  return findings
}

export function checkJsonConfigs(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const f of config.jsonConfigs) {
    try {
      JSON.parse(f.content)
    } catch (e) {
      findings.push({ level: "ERROR", message: `${f.relPath}: invalid JSON (${(e as Error).message})` })
    }
  }
  return findings
}

export function checkSecrets(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const file of allFiles(config)) {
    for (const m of scanSecrets(file.content)) {
      findings.push({ level: "ERROR", message: `Possible secret in ${file.relPath}: ${m.kind} (${m.snippet})` })
    }
  }
  return findings
}

export function analyze(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  return [
    ...checkAiConfigPresence(config),
    ...checkClaudeMdLength(config),
    ...checkDeadRefs(config, fileExists),
    ...checkClaudeMdStructure(config),
    ...checkSkillQuality(config),
    ...checkSkillOverlap(config),
    ...checkRedundancy(config),
    ...checkFrontmatter(config),
    ...checkJsonConfigs(config),
    ...checkSecrets(config),
  ]
}
