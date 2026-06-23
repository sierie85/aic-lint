export interface ConfigFile {
  path: string
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
  geminiMd: ConfigFile | null
  aiDocs: ConfigFile[]
  jsonConfigs: ConfigFile[]
}

export interface Finding {
  level: "ERROR" | "WARN" | "INFO"
  message: string
}

export interface ContextBudget {
  claudeMdFiles: Record<string, number>
  skills: Record<string, number>
  totalEstimatedTokens: number
}
