export interface ConfigFile {
  relPath: string
  content: string
  lineCount: number
}

export interface ProjectConfig {
  root: string
  claudeMdFiles: ConfigFile[]
  skills: ConfigFile[]
  agents: ConfigFile[]
  agentsMd: ConfigFile | null
  agentsOverrideMd: ConfigFile | null
  codexAgentsMd: ConfigFile | null
  geminiMd: ConfigFile | null
  aiDocs: ConfigFile[]
  jsonConfigs: ConfigFile[]
}

export interface Finding {
  level: "ERROR" | "WARN" | "INFO"
  message: string
}

export interface ContextBudget {
  files: Record<string, number>
  totalEstimatedTokens: number
}
