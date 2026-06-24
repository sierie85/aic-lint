import { existsSync, readFileSync } from "fs"
import { join } from "path"

export const CONFIG_FILENAME = ".aiclintrc.json"

export interface Thresholds {
  claudeMdWarnLines: number
  claudeMdErrorLines: number
  alwaysOnWarnTokens: number
  alwaysOnErrorTokens: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  claudeMdWarnLines: 80,
  claudeMdErrorLines: 150,
  alwaysOnWarnTokens: 8000,
  alwaysOnErrorTokens: 16000,
}

// Per-check override: "off" skips the check entirely; the others force every
// finding of that check to the given level.
export type RuleLevel = "off" | "info" | "warn" | "error"

export interface Settings {
  rules: Record<string, RuleLevel>
  thresholds: Thresholds
}

export const DEFAULT_SETTINGS: Settings = { rules: {}, thresholds: DEFAULT_THRESHOLDS }

const VALID_RULES = new Set<string>(["off", "info", "warn", "error"])

// Reads .aiclintrc.json from the project root and merges it over the defaults.
// A missing file yields defaults; an invalid file is reported to stderr and
// ignored (the audit still runs with defaults).
export function loadSettings(root: string): Settings {
  const path = join(root, CONFIG_FILENAME)
  if (!existsSync(path)) return DEFAULT_SETTINGS

  let parsed: { rules?: Record<string, unknown>; thresholds?: Record<string, unknown> }
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"))
  } catch (e) {
    process.stderr.write(`aic-lint: ignoring invalid ${CONFIG_FILENAME} (${(e as Error).message})\n`)
    return DEFAULT_SETTINGS
  }

  const rules: Record<string, RuleLevel> = {}
  for (const [id, level] of Object.entries(parsed.rules ?? {})) {
    if (typeof level === "string" && VALID_RULES.has(level)) rules[id] = level as RuleLevel
  }

  const thresholds = { ...DEFAULT_THRESHOLDS }
  for (const key of Object.keys(DEFAULT_THRESHOLDS) as (keyof Thresholds)[]) {
    const value = parsed.thresholds?.[key]
    if (typeof value === "number") thresholds[key] = value
  }

  return { rules, thresholds }
}
