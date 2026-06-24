import type { ConfigFile, ProjectConfig } from "./types.js"

export function cf(relPath: string, content: string): ConfigFile {
  return {
    relPath,
    content,
    lineCount: content.split("\n").length,
  }
}

export function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    root: "/project",
    claudeMdFiles: [],
    skills: [],
    agents: [],
    agentsMd: null,
    agentsOverrideMd: null,
    codexAgentsMd: null,
    geminiMd: null,
    cursorRules: [],
    aiDocs: [],
    jsonConfigs: [],
    gitignore: null,
    ...overrides,
  }
}

export function lines(n: number): string {
  return Array.from({ length: n }, (_, i) => `Line ${i + 1}`).join("\n")
}
