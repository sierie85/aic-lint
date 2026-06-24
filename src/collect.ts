import { readFileSync, readdirSync, existsSync, statSync } from "fs"
import { join, relative } from "path"
import type { ConfigFile, ProjectConfig } from "./types.js"
import { parseFrontmatter } from "./frontmatter.js"

function readConfigFile(absPath: string, root: string): ConfigFile {
  const content = readFileSync(absPath, "utf8")
  return {
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

export function collect(root: string): ProjectConfig {
  const claudeMdFiles = findFiles(root, "CLAUDE.md")
    .sort()
    .map((p) => readConfigFile(p, root))

  const skills = readDir(join(root, ".claude", "commands"), ".md", root)
  const agents = readDir(join(root, ".claude", "agents"), ".md", root)

  const agentsMd = readFileIfExists(join(root, "AGENTS.md"), root)
  const agentsOverrideMd = readFileIfExists(join(root, "AGENTS.override.md"), root)
  const codexAgentsMd = readFileIfExists(join(root, ".codex", "AGENTS.md"), root)
  const geminiMd = readFileIfExists(join(root, "GEMINI.md"), root)

  // Cursor: the legacy .cursorrules root file plus the newer .cursor/rules/*.mdc files.
  const cursorRules = [
    ...compact(readFileIfExists(join(root, ".cursorrules"), root)),
    ...readDir(join(root, ".cursor", "rules"), ".mdc", root),
  ]

  const aiDocs = readDir(join(root, "docs", "ai"), ".md", root)

  const jsonConfigs = [
    join(root, ".claude", "settings.json"),
    join(root, ".claude", "settings.local.json"),
    join(root, ".mcp.json"),
  ]
    .filter((p) => existsSync(p))
    .map((p) => readConfigFile(p, root))

  const gitignore = readFileIfExists(join(root, ".gitignore"), root)

  return { root, claudeMdFiles, skills, agents, agentsMd, agentsOverrideMd, codexAgentsMd, geminiMd, cursorRules, aiDocs, jsonConfigs, gitignore }
}

// All prose/Markdown files — relevant for checks that parse content
// (dead references, redundancy). JSON configs are intentionally excluded here.
export function markdownFiles(config: ProjectConfig): ConfigFile[] {
  return [
    ...config.claudeMdFiles,
    ...config.skills,
    ...config.agents,
    ...config.aiDocs,
    ...config.cursorRules,
    ...compact(config.agentsMd, config.agentsOverrideMd, config.codexAgentsMd, config.geminiMd),
  ]
}

// Truly every file that was read — relevant for the secret scan,
// which must not skip anything.
export function allFiles(config: ProjectConfig): ConfigFile[] {
  return [...markdownFiles(config), ...config.jsonConfigs]
}

// A Cursor rule is always-on if it is the legacy .cursorrules file, or a
// .cursor/rules/*.mdc file with `alwaysApply: true` in its frontmatter.
function isAlwaysOnCursorRule(file: ConfigFile): boolean {
  if (file.relPath === ".cursorrules") return true
  return parseFrontmatter(file.content).fields.alwaysApply === "true"
}

// Files loaded into the model's context on *every* session — the per-session
// token cost. Everything else in markdownFiles() is on-demand.
export function alwaysOnFiles(config: ProjectConfig): ConfigFile[] {
  return [
    ...config.claudeMdFiles,
    ...compact(config.agentsMd, config.agentsOverrideMd, config.codexAgentsMd, config.geminiMd),
    ...config.cursorRules.filter(isAlwaysOnCursorRule),
  ]
}
