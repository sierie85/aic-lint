import type { ContextBudget, ProjectConfig } from "./types.js"
import { alwaysOnFiles, markdownFiles } from "./collect.js"

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
  const alwaysOn = new Set(alwaysOnFiles(config).map((f) => f.relPath))
  const files = markdownFiles(config).map((f) => ({
    relPath: f.relPath,
    tokens: estimateTokens(f.content),
    alwaysOn: alwaysOn.has(f.relPath),
  }))
  const sum = (subset: typeof files) => subset.reduce((a, f) => a + f.tokens, 0)
  const alwaysOnTokens = sum(files.filter((f) => f.alwaysOn))
  const onDemandTokens = sum(files.filter((f) => !f.alwaysOn))
  return { files, alwaysOnTokens, onDemandTokens, totalEstimatedTokens: alwaysOnTokens + onDemandTokens }
}
