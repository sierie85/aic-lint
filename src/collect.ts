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

function findFiles(dir: string, name: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
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

  const agentsPath = join(root, "AGENTS.md")
  const agentsMd = existsSync(agentsPath) ? readConfigFile(agentsPath, root) : null

  const geminiPath = join(root, "GEMINI.md")
  const geminiMd = existsSync(geminiPath) ? readConfigFile(geminiPath, root) : null

  const aiDocs = readDir(join(root, "docs", "ai"), ".md", root)

  const jsonConfigs = [
    join(root, ".claude", "settings.json"),
    join(root, ".claude", "settings.local.json"),
    join(root, ".mcp.json"),
  ]
    .filter((p) => existsSync(p))
    .map((p) => readConfigFile(p, root))

  return { root, claudeMdFiles, skills, agents, agentsMd, geminiMd, aiDocs, jsonConfigs }
}
