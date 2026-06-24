export interface SecretMatch {
  kind: string
  snippet: string
}

const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "Anthropic API Key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { kind: "OpenAI API Key", re: /sk-(?:proj-)?[A-Za-z0-9]{20,}/ },
  { kind: "AWS Access Key", re: /A(?:KIA|SIA)[0-9A-Z]{16}/ },
  { kind: "GitHub Token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { kind: "GitHub PAT", re: /github_pat_[A-Za-z0-9_]{50,}/ },
  { kind: "GitLab PAT", re: /glpat-[A-Za-z0-9_-]{20,}/ },
  { kind: "Slack Token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { kind: "Slack Webhook", re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]{20,}/ },
  { kind: "Google API Key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { kind: "Stripe Secret Key", re: /sk_(?:live|test)_[A-Za-z0-9]{20,}/ },
  { kind: "Stripe Restricted Key", re: /rk_(?:live|test)_[A-Za-z0-9]{20,}/ },
  { kind: "Twilio Account SID", re: /AC[0-9a-f]{32}/ },
  { kind: "Twilio API Key", re: /SK[0-9a-f]{32}/ },
  { kind: "SendGrid API Key", re: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/ },
  { kind: "Mailgun API Key", re: /key-[0-9a-zA-Z]{32}/ },
  { kind: "npm Token", re: /npm_[A-Za-z0-9]{36}/ },
  { kind: "PyPI Token", re: /pypi-[A-Za-z0-9_-]{16,}/ },
  { kind: "DigitalOcean Token", re: /dop_v1_[a-f0-9]{64}/ },
  { kind: "Square Access Token", re: /sq0(?:atp|csp)-[A-Za-z0-9_-]{22,}/ },
  { kind: "Shopify Token", re: /shp(?:at|ss|ca|pa)_[A-Za-z0-9]{32}/ },
  { kind: "Telegram Bot Token", re: /\d{8,10}:[A-Za-z0-9_-]{35}/ },
  { kind: "Hugging Face Token", re: /hf_[A-Za-z0-9]{34}/ },
  { kind: "Notion Token", re: /(?:secret_[A-Za-z0-9]{43}|ntn_[A-Za-z0-9]{40,})/ },
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
