import type { ContextBudget, ProjectConfig } from "./types.js"
import { markdownFiles } from "./collect.js"

// Local, dependency-free token estimate. Blends a character-based
// (~chars/4, close to real BPE tokenization for English prose) and a
// word-based heuristic. Good enough for a rough context-budget figure;
// exact counts would require a model-specific tokenizer or an API call.
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const byChars = text.length / 3.8
  const byWords = words * 1.3
  return Math.ceil((byChars + byWords) / 2)
}

export function buildContextBudget(config: ProjectConfig): ContextBudget {
  const files: Record<string, number> = {}
  for (const f of markdownFiles(config)) {
    files[f.relPath] = estimateTokens(f.content)
  }
  const totalEstimatedTokens = Object.values(files).reduce((a, b) => a + b, 0)
  return { files, totalEstimatedTokens }
}
