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
  gitignore: ConfigFile | null
}

export interface Fix {
  relPath: string // file to modify, relative to the project root
  description: string // human-readable summary, shown in --fix / --fix-dry-run
  apply: (content: string) => string // pure transform of the file's content
}

export type Category = "structure" | "maintainability" | "validity" | "security"

export interface Finding {
  level: "ERROR" | "WARN" | "INFO"
  message: string
  fix?: Fix
  category?: Category
}

export interface Score {
  overall: number
  grade: string
  dimensions: Record<Category, number>
}

export interface ContextBudget {
  files: Record<string, number>
  totalEstimatedTokens: number
}
