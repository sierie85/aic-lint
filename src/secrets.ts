export interface SecretMatch {
  kind: string
  snippet: string
}

const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "Anthropic API Key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { kind: "OpenAI API Key", re: /sk-(?:proj-)?[A-Za-z0-9]{20,}/ },
  { kind: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/ },
  { kind: "GitHub Token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { kind: "GitHub PAT", re: /github_pat_[A-Za-z0-9_]{50,}/ },
  { kind: "Slack Token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { kind: "Google API Key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { kind: "Private Key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
]

function redact(s: string): string {
  if (s.length <= 8) return "***"
  return `${s.slice(0, 4)}…${s.slice(-2)}`
}

export function scanSecrets(text: string): SecretMatch[] {
  const matches: SecretMatch[] = []
  for (const { kind, re } of PATTERNS) {
    const m = text.match(re)
    if (m) matches.push({ kind, snippet: redact(m[0]) })
  }
  return matches
}
