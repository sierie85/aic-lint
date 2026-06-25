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
  cursorRules: ConfigFile[]
  aiDocs: ConfigFile[]
  jsonConfigs: ConfigFile[]
  gitignore: ConfigFile | null
}

export interface Fix {
  relPath: string // file to modify, relative to the project root
  description: string // human-readable summary, shown in --fix / --fix-dry-run
  apply: (content: string) => string // pure transform of the file's content
}

export type Category = "structure" | "efficiency" | "maintainability" | "validity" | "security"

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

export interface BudgetFile {
  relPath: string
  tokens: number
  alwaysOn: boolean // loaded into context every session (vs. on-demand)
}

export type AttentionPosition = "top" | "middle" | "bottom" | "n/a"

// Per always-on file: its share of the always-on budget and a "lost in the
// middle" position estimate. Deterministic proxies, never measured attention.
export interface AttentionEntry {
  relPath: string
  tokens: number
  share: number // percent of always-on tokens (0–100)
  position: AttentionPosition
  risk: boolean // substantial file stuck in the middle of a large context
}

export interface ContextBudget {
  files: BudgetFile[]
  alwaysOnTokens: number
  onDemandTokens: number
  totalEstimatedTokens: number
  attention: AttentionEntry[]
}
