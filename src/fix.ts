import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import type { Finding } from "./types.js"

// --- Pure content transforms (used by checks to build Fix.apply) ---

// Prepend a YAML frontmatter block with the given fields.
export function prependFrontmatter(content: string, fields: Record<string, string>): string {
  const block = ["---", ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`), "---", ""]
  return block.join("\n") + content
}

// Insert `key: value` right after the opening `---` of an existing frontmatter block.
export function insertFrontmatterField(content: string, key: string, value: string): string {
  const lines = content.split("\n")
  lines.splice(1, 0, `${key}: ${value}`)
  return lines.join("\n")
}

// Append a line, ensuring it sits on its own line with a trailing newline.
export function appendLine(content: string, line: string): string {
  const prefix = content === "" || content.endsWith("\n") ? content : content + "\n"
  return `${prefix}${line}\n`
}

// --- Applier ---

export interface AppliedFix {
  relPath: string
  description: string
}

export interface ApplyOptions {
  dryRun?: boolean
}

// Applies every fixable finding. Fixes are grouped per file and chained, so
// multiple fixes on the same file build on each other. The current content is
// read fresh from disk ("" if the file is missing, e.g. a new .gitignore).
export function applyFixes(root: string, findings: Finding[], options: ApplyOptions = {}): AppliedFix[] {
  const byFile = new Map<string, Finding["fix"][]>()
  for (const f of findings) {
    if (!f.fix) continue
    const list = byFile.get(f.fix.relPath) ?? []
    list.push(f.fix)
    byFile.set(f.fix.relPath, list)
  }

  const applied: AppliedFix[] = []
  for (const [relPath, fixes] of byFile) {
    const absPath = join(root, relPath)
    let content = existsSync(absPath) ? readFileSync(absPath, "utf8") : ""
    for (const fix of fixes) {
      content = fix!.apply(content)
      applied.push({ relPath, description: fix!.description })
    }
    if (!options.dryRun) writeFileSync(absPath, content)
  }
  return applied
}
