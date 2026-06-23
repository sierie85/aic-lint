# Claude Config Audit Tool

Ein **lokaler Linter für deine Claude-Konfiguration** — prüft `CLAUDE.md`, Skills,
Agents und weitere Config-Dateien auf Qualität, Redundanz, tote Referenzen und
versehentlich eingecheckte Secrets.

> 🔒 **Komplett lokal.** Kein Anthropic-API, kein Netzwerk, kein API-Key, kein Abo.
> Null Runtime-Dependencies — läuft überall, wo Node.js läuft.

---

## Highlights

- **Deterministisch** — keine LLM-Calls, gleiche Eingabe → gleiches Ergebnis
- **Null Runtime-Dependencies** — nur `tsx` + `typescript` als Dev-Tools
- **CI-tauglich** — `--json`-Output und sinnvolle Exit-Codes
- **Als `/audit`-Skill** direkt in Claude Code nutzbar

---

## Installation

Voraussetzung: **Node.js ≥ 18**.

```bash
git clone <repo-url> audit_tool
cd audit_tool
npm install
```

---

## Verwendung (CLI)

```bash
npx tsx src/index.ts <projekt-pfad> [--no-budget] [--json]
```

Beispiele:

```bash
# Aktuelles Verzeichnis auditieren (Markdown-Report)
npx tsx src/index.ts .

# Ein anderes Projekt prüfen
npx tsx src/index.ts ../mein-projekt

# Ohne Context-Budget-Tabelle
npx tsx src/index.ts . --no-budget

# Maschinen-lesbar (für CI)
npx tsx src/index.ts . --json
```

Oder über das npm-Script:

```bash
npm run audit -- . --json
```

### Flags

| Flag | Wirkung |
|---|---|
| `<projekt-pfad>` | Wurzelverzeichnis des zu prüfenden Projekts (Default: `.`) |
| `--no-budget` | Context-Budget-Tabelle weglassen |
| `--json` | JSON statt Markdown ausgeben |

### Exit-Codes

| Code | Bedeutung |
|---|---|
| `0` | Keine Fehler (Warnungen/Hinweise möglich) |
| `1` | Mindestens ein **ERROR** gefunden |

So lässt sich das Tool in CI als Gate verwenden:

```bash
npx tsx src/index.ts . --json || echo "Audit fehlgeschlagen"
```

---

## Verwendung als `/audit`-Skill in Claude Code

Das Repo bringt einen fertigen Slash-Command mit: `.claude/commands/audit.md`.

### Im Tool-Repo selbst

In Claude Code einfach eingeben:

```
/audit
```

Der Skill ruft das CLI auf und gibt den Report aus. Varianten:

```
/audit --no-budget
/audit --json
```

### Skill in einem anderen Projekt nutzen

1. Kopiere `.claude/commands/audit.md` in das `.claude/commands/`-Verzeichnis
   deines Zielprojekts.
2. Passe im Skill den Pfad zum Tool an (die Zeile mit `npx tsx .../src/index.ts`),
   z. B. auf den absoluten Pfad deiner Audit-Tool-Installation:

   ```bash
   npx tsx /pfad/zu/audit_tool/src/index.ts "$CLAUDE_PROJECT_ROOT"
   ```

3. `/audit` steht dann im Zielprojekt zur Verfügung und prüft dessen Konfiguration.

---

## Was wird geprüft

Gesammelt und analysiert werden:

| Quelle | Pfad |
|---|---|
| Projekt-Memory | `CLAUDE.md` (rekursiv, alle Ebenen) |
| Skills / Commands | `.claude/commands/*.md` |
| Subagents | `.claude/agents/*.md` |
| Settings | `.claude/settings.json`, `.claude/settings.local.json` |
| MCP-Server | `.mcp.json` |
| Multi-Tool | `AGENTS.md`, `GEMINI.md` |
| Tool-agnostische Docs | `docs/ai/*.md` |

Die vollständige Liste aller Checks steht in **[docs/checks.md](docs/checks.md)**.
Konzept und Hintergrund: **[docs/overview.md](docs/overview.md)**.

---

## Entwicklung

```bash
npm test         # Test-Suite (Node-eigener Test-Runner via tsx)
npm run typecheck # tsc --noEmit
```

### Projektstruktur

```
src/
  index.ts       Entry-Point: Argumente parsen, Format wählen, Exit-Code
  audit.ts       Orchestrierung (collect → analyze → budget)
  collect.ts     Config-Dateien einlesen → ProjectConfig
  analyze.ts     Alle statischen Checks → Finding[]
  estimate.ts    Lokale Token-Schätzung → ContextBudget
  report.ts      Markdown-Report
  frontmatter.ts YAML-Frontmatter-Parser (minimal, dependency-frei)
  secrets.ts     Secret-Pattern-Scanner
  types.ts       Gemeinsame Typen
  *.test.ts      Tests (neben dem jeweiligen Modul)
.claude/
  commands/
    audit.md     /audit-Skill
docs/
  overview.md    Produktbeschreibung & Konzept
  checks.md      Referenz aller Checks
```

Die Logik ist über Dependency Injection testbar (`fileExists`, injizierbare
Funktionen), sodass die Tests ohne echtes Dateisystem oder Netzwerk auskommen.
