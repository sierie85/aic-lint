import type { AttentionEntry, AttentionPosition, ContextBudget, ProjectConfig } from "./types.js"
import { alwaysOnFiles, markdownFiles } from "./collect.js"

// Below this many always-on tokens, "lost in the middle" doesn't meaningfully
// apply (the whole context sits near the top), so position/risk are "n/a".
const DEFAULT_POSITION_GATE_TOKENS = 8000
// A file must hold at least this share of the always-on budget to be flagged
// as an attention risk — tiny files in the middle aren't worth worrying about.
const ATTENTION_RISK_MIN_SHARE = 10

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

function bucket(relativeMidpoint: number): AttentionPosition {
  if (relativeMidpoint < 0.25) return "top"
  if (relativeMidpoint >= 0.75) return "bottom"
  return "middle"
}

// Ranks the always-on files by token weight and estimates each one's "lost in
// the middle" position. Files are placed in their load order to derive position;
// the result is sorted by token weight (heaviest first) for display.
function buildAttention(config: ProjectConfig, total: number, gateTokens: number): AttentionEntry[] {
  const ordered = alwaysOnFiles(config).map((f) => ({ relPath: f.relPath, tokens: estimateTokens(f.content) }))
  const gated = total > gateTokens

  let offset = 0
  const entries: AttentionEntry[] = ordered.map(({ relPath, tokens }) => {
    const midpoint = total > 0 ? (offset + tokens / 2) / total : 0
    offset += tokens
    const share = total > 0 ? (tokens / total) * 100 : 0
    const position = gated ? bucket(midpoint) : "n/a"
    const risk = gated && position === "middle" && share >= ATTENTION_RISK_MIN_SHARE
    return { relPath, tokens, share: Math.round(share), position, risk }
  })

  return entries.sort((a, b) => b.tokens - a.tokens)
}

export function buildContextBudget(
  config: ProjectConfig,
  positionGateTokens: number = DEFAULT_POSITION_GATE_TOKENS,
): ContextBudget {
  const alwaysOn = new Set(alwaysOnFiles(config).map((f) => f.relPath))
  const files = markdownFiles(config).map((f) => ({
    relPath: f.relPath,
    tokens: estimateTokens(f.content),
    alwaysOn: alwaysOn.has(f.relPath),
  }))
  const sum = (subset: typeof files) => subset.reduce((a, f) => a + f.tokens, 0)
  const alwaysOnTokens = sum(files.filter((f) => f.alwaysOn))
  const onDemandTokens = sum(files.filter((f) => !f.alwaysOn))
  const attention = buildAttention(config, alwaysOnTokens, positionGateTokens)
  return {
    files,
    alwaysOnTokens,
    onDemandTokens,
    totalEstimatedTokens: alwaysOnTokens + onDemandTokens,
    attention,
  }
}
