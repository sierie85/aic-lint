import type { ContextBudget, ProjectConfig } from "./types.js"

function sum(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0)
}

// Grobe lokale Schätzung — Anthropic veröffentlicht keinen Offline-Tokenizer
// für Claude 3/4. Mischung aus Zeichen- und Wort-Heuristik.
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const byChars = text.length / 3.8
  const byWords = words * 1.3
  return Math.ceil((byChars + byWords) / 2)
}

export function buildContextBudget(config: ProjectConfig): ContextBudget {
  const claudeMdFiles: Record<string, number> = {}
  for (const f of config.claudeMdFiles) {
    claudeMdFiles[f.relPath] = estimateTokens(f.content)
  }

  const skills: Record<string, number> = {}
  for (const s of config.skills) {
    skills[s.relPath] = estimateTokens(s.content)
  }

  return {
    claudeMdFiles,
    skills,
    totalEstimatedTokens: sum(claudeMdFiles) + sum(skills),
  }
}
