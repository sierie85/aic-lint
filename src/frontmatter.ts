export interface Frontmatter {
  present: boolean
  valid: boolean
  fields: Record<string, string>
}

export function parseFrontmatter(content: string): Frontmatter {
  const lines = content.split("\n")
  if (lines[0]?.trim() !== "---") {
    return { present: false, valid: false, fields: {} }
  }

  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i
      break
    }
  }
  if (end === -1) {
    return { present: true, valid: false, fields: {} }
  }

  const fields: Record<string, string> = {}
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (m) fields[m[1]] = m[2].trim()
  }
  return { present: true, valid: true, fields }
}
