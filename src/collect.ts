import { readFileSync, readdirSync, existsSync, statSync } from "fs"
import { join, relative } from "path"
import type { ConfigFile, ProjectConfig } from "./types.js"

function readConfigFile(absPath: string, root: string): ConfigFile {
  const content = readFileSync(absPath, "utf8")
  return {
    path: absPath,
    relPath: relative(root, absPath),
    content,
    lineCount: content.split("\n").length,
  }
}

function readFileIfExists(absPath: string, root: string): ConfigFile | null {
  return existsSync(absPath) ? readConfigFile(absPath, root) : null
}

function compact<T>(...items: (T | null | undefined)[]): T[] {
  return items.filter((x): x is T => x != null)
}

const IGNORED_DIRS = new Set(["node_modules", "dist", "build", "coverage", "vendor"])

function findFiles(dir: string, name: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) continue
      results.push(...findFiles(fullPath, name))
    } else if (entry.isFile() && entry.name === name) {
      results.push(fullPath)
    }
  }
  return results
}

function readDir(dir: string, ext: string, root: string): ConfigFile[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext) && statSync(join(dir, f)).isFile())
    .sort()
    .map((f) => readConfigFile(join(dir, f), root))
}

export function collect(projectRoot: string): ProjectConfig {
  const root = projectRoot

  const claudeMdPaths = findFiles(root, "CLAUDE.md").sort()
  const claudeMdFiles = claudeMdPaths.map((p) => readConfigFile(p, root))

  const skills = readDir(join(root, ".claude", "commands"), ".md", root)
  const agents = readDir(join(root, ".claude", "agents"), ".md", root)

  const agentsMd = readFileIfExists(join(root, "AGENTS.md"), root)
  const agentsOverrideMd = readFileIfExists(join(root, "AGENTS.override.md"), root)
  const codexAgentsMd = readFileIfExists(join(root, ".codex", "AGENTS.md"), root)
  const geminiMd = readFileIfExists(join(root, "GEMINI.md"), root)

  const aiDocs = readDir(join(root, "docs", "ai"), ".md", root)

  const jsonConfigs = [
    join(root, ".claude", "settings.json"),
    join(root, ".claude", "settings.local.json"),
    join(root, ".mcp.json"),
  ]
    .filter((p) => existsSync(p))
    .map((p) => readConfigFile(p, root))

  return { root, claudeMdFiles, skills, agents, agentsMd, agentsOverrideMd, codexAgentsMd, geminiMd, aiDocs, jsonConfigs }
}

// Alle Prosa-/Markdown-Dateien — relevant für Checks, die Inhalt parsen
// (tote Referenzen, Redundanz). JSON-Configs sind hier bewusst ausgenommen.
export function markdownFiles(config: ProjectConfig): ConfigFile[] {
  return [
    ...config.claudeMdFiles,
    ...config.skills,
    ...config.agents,
    ...config.aiDocs,
    ...compact(config.agentsMd, config.agentsOverrideMd, config.codexAgentsMd, config.geminiMd),
  ]
}

// Wirklich alle eingelesenen Dateien — relevant für den Secret-Scan,
// der nichts auslassen darf.
export function allFiles(config: ProjectConfig): ConfigFile[] {
  return [...markdownFiles(config), ...config.jsonConfigs]
}
