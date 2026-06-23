import { existsSync } from "fs"
import { join } from "path"
import type { Finding, ProjectConfig } from "./types.js"
import { parseFrontmatter } from "./frontmatter.js"
import { scanSecrets } from "./secrets.js"

export const FILE_EXTENSIONS = new Set([
  "md", "py", "js", "ts", "tsx", "jsx", "json", "toml", "yaml", "yml",
  "sh", "bash", "txt", "cfg", "ini", "env", "html", "css", "rs", "go",
  "rb", "java", "kt", "cs", "cpp", "c", "h", "lock", "sql",
])

export type FileExists = (absPath: string) => boolean

export function extractFileRefs(text: string): string[] {
  const refs: string[] = []
  for (const m of text.matchAll(/`([^`\s]+)`/g)) {
    const c = m[1]
    if (c.startsWith("http") || c.startsWith("#") || /[*?]/.test(c)) continue
    const ext = c.includes(".") ? c.split(".").pop()!.toLowerCase() : ""
    if (FILE_EXTENSIONS.has(ext)) refs.push(c)
  }
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const c = m[2]
    if (!c.startsWith("http") && !c.startsWith("#") && !/[*?]/.test(c)) refs.push(c)
  }
  return refs
}

export function extractH2Headings(text: string): Set<string> {
  const headings = new Set<string>()
  for (const m of text.matchAll(/^## (.+)$/gm)) headings.add(m[1].trim())
  return headings
}

export function stripCodeFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "")
}

export function checkClaudeMdPresence(config: ProjectConfig): Finding[] {
  if (config.claudeMdFiles.length === 0) {
    return [{ level: "WARN", message: "Keine CLAUDE.md gefunden" }]
  }
  return []
}

export function checkClaudeMdLength(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const f of config.claudeMdFiles) {
    if (f.lineCount > 150) {
      findings.push({ level: "ERROR", message: `${f.relPath}: ${f.lineCount} Zeilen (empfohlen: < 80)` })
    } else if (f.lineCount > 80) {
      findings.push({ level: "WARN", message: `${f.relPath}: ${f.lineCount} Zeilen (empfohlen: < 80)` })
    }
  }
  return findings
}

export function checkDeadRefs(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  const findings: Finding[] = []
  const files = [
    ...config.claudeMdFiles,
    ...config.skills,
    ...(config.agentsMd ? [config.agentsMd] : []),
  ]
  for (const file of files) {
    for (const ref of extractFileRefs(file.content)) {
      if (!fileExists(join(config.root, ref))) {
        findings.push({ level: "ERROR", message: `Toter Pfad in ${file.relPath}: \`${ref}\`` })
      }
    }
  }
  return findings
}

export function checkAgentsParity(config: ProjectConfig): Finding[] {
  if (config.agentsMd && config.claudeMdFiles.length === 0) {
    return [{ level: "WARN", message: "AGENTS.md vorhanden aber keine CLAUDE.md" }]
  }
  if (config.claudeMdFiles.length > 0 && !config.agentsMd) {
    return [{ level: "INFO", message: "Keine AGENTS.md — Codex-Nutzer haben keinen Context" }]
  }
  return []
}

export function checkAiDocs(config: ProjectConfig): Finding[] {
  if (config.aiDocs.length === 0) {
    return [{ level: "INFO", message: "Kein /docs/ai/ Verzeichnis — tool-agnostische AI-Basis fehlt" }]
  }
  return []
}

export function checkClaudeMdStructure(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  for (const f of config.claudeMdFiles) {
    if (f.lineCount > 20 && !/^## /m.test(f.content)) {
      findings.push({ level: "WARN", message: `${f.relPath}: unstrukturierter Inhalt (kein ## Abschnitt)` })
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
      findings.push({ level: "WARN", message: `Skill ${skill.relPath}: kein Titel oder kein beschreibender Text` })
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
          message: `Skill-Overlap: ${config.skills[i].relPath} + ${config.skills[j].relPath} teilen: ${sections}`,
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
      findings.push({ level: "WARN", message: `Redundanz in ${where}: "${preview}"` })
    }
  }
  return findings
}

export function checkFrontmatter(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []

  for (const s of config.skills) {
    const fm = parseFrontmatter(s.content)
    if (fm.present && !fm.valid) {
      findings.push({ level: "WARN", message: `${s.relPath}: Frontmatter nicht geschlossen (--- fehlt)` })
    } else if (fm.present && fm.valid && !fm.fields.description) {
      findings.push({ level: "INFO", message: `${s.relPath}: Frontmatter ohne 'description'` })
    }
  }

  for (const a of config.agents) {
    const fm = parseFrontmatter(a.content)
    if (!fm.present) {
      findings.push({ level: "WARN", message: `${a.relPath}: Agent ohne Frontmatter (name/description erforderlich)` })
      continue
    }
    if (!fm.valid) {
      findings.push({ level: "WARN", message: `${a.relPath}: Frontmatter nicht geschlossen (--- fehlt)` })
      continue
    }
    for (const key of ["name", "description"]) {
      if (!fm.fields[key]) {
        findings.push({ level: "WARN", message: `${a.relPath}: Agent-Frontmatter ohne '${key}'` })
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
      findings.push({ level: "ERROR", message: `${f.relPath}: ungültiges JSON (${(e as Error).message})` })
    }
  }
  return findings
}

export function checkSecrets(config: ProjectConfig): Finding[] {
  const findings: Finding[] = []
  const files = [
    ...config.claudeMdFiles,
    ...config.skills,
    ...config.agents,
    ...config.jsonConfigs,
    ...config.aiDocs,
    ...(config.agentsMd ? [config.agentsMd] : []),
    ...(config.geminiMd ? [config.geminiMd] : []),
  ]
  for (const file of files) {
    for (const m of scanSecrets(file.content)) {
      findings.push({ level: "ERROR", message: `Mögliches Secret in ${file.relPath}: ${m.kind} (${m.snippet})` })
    }
  }
  return findings
}

export function analyze(config: ProjectConfig, fileExists: FileExists = existsSync): Finding[] {
  return [
    ...checkClaudeMdPresence(config),
    ...checkClaudeMdLength(config),
    ...checkDeadRefs(config, fileExists),
    ...checkAgentsParity(config),
    ...checkAiDocs(config),
    ...checkClaudeMdStructure(config),
    ...checkSkillQuality(config),
    ...checkSkillOverlap(config),
    ...checkRedundancy(config),
    ...checkFrontmatter(config),
    ...checkJsonConfigs(config),
    ...checkSecrets(config),
  ]
}
