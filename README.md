# aic-lint

Ein **lokaler Linter für AI-Coding-Assistant-Configs** — prüft `CLAUDE.md`, `AGENTS.md`,
Skills, Subagents und weitere Config-Dateien auf Qualität, Redundanz, tote Referenzen
und versehentlich eingecheckte Secrets.

Unterstützt: **Claude Code**, **Codex CLI**, **Gemini CLI** und alle Tools,
die auf `CLAUDE.md`- oder `AGENTS.md`-Konventionen basieren.

> **Komplett lokal.** Kein API-Key, kein Abo, kein Netzwerk.
> Null Runtime-Dependencies — läuft überall, wo Node.js läuft.

---

## Highlights

- **Deterministisch** — keine LLM-Calls, gleiche Eingabe → gleiches Ergebnis
- **Null Runtime-Dependencies** — nur `tsx` + `typescript` als Dev-Tools
- **CI-tauglich** — `--json`-Output und sinnvolle Exit-Codes
- **Multi-Tool** — erkennt `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `docs/ai/` und mehr

---

## Installation

Voraussetzung: **Node.js ≥ 18**.

### Option A — Standalone (empfohlen)

Einmalig an einem zentralen Ort klonen, dann von jedem Projekt aus nutzbar:

```bash
git clone <repo-url> ~/.aic-lint
cd ~/.aic-lint
npm install
```

### Option B — Als Git-Submodule im bestehenden Repo

```bash
cd mein-projekt
git submodule add <repo-url> .aic-lint
cd .aic-lint && npm install
```

---

## Verwendung (CLI)

```bash
npx tsx ~/.aic-lint/src/index.ts <projekt-pfad> [--no-budget] [--json]
```

Beispiele:

```bash
# Aktuelles Verzeichnis (Markdown-Report)
npx tsx ~/.aic-lint/src/index.ts .

# Ohne Context-Budget-Tabelle
npx tsx ~/.aic-lint/src/index.ts . --no-budget

# Maschinen-lesbar (für CI)
npx tsx ~/.aic-lint/src/index.ts . --json
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

CI-Gate-Beispiel:

```bash
npx tsx ~/.aic-lint/src/index.ts . --json || echo "Audit fehlgeschlagen"
```

---

## Integration

### Claude Code — `/audit`-Skill

Das Repo bringt einen fertigen Slash-Command mit: `.claude/commands/audit.md`.

Im Tool-Repo selbst direkt aufrufbar:

```
/audit
/audit --no-budget
/audit --json
```

**Skill in ein anderes Projekt übernehmen:**

1. `.claude/commands/audit.md` in das `.claude/commands/`-Verzeichnis des Zielprojekts kopieren.
2. Den Pfad im Skill auf die eigene Installation anpassen:

   ```bash
   npx tsx ~/.aic-lint/src/index.ts "$CLAUDE_PROJECT_ROOT"
   ```

3. `/audit` steht jetzt im Zielprojekt zur Verfügung.

### Codex CLI

Direkt aus dem Terminal oder als Shell-Befehl im Codex-Kontext:

```bash
npx tsx ~/.aic-lint/src/index.ts .
```

Das Tool erkennt `AGENTS.md` automatisch und prüft sie auf Qualität, Struktur und
Parität mit `CLAUDE.md` — sinnvoll für Projekte, die beide Tools parallel nutzen.

---

## Was wird geprüft

| Pfad | Beschreibung |
|---|---|
| `CLAUDE.md` (rekursiv) | Projekt-Kontext für Claude Code |
| `.claude/commands/*.md` | Slash-Commands / Skills |
| `.claude/agents/*.md` | Subagents |
| `.claude/settings.json` | Claude Code Projekt-Settings |
| `.claude/settings.local.json` | Lokale Overrides |
| `.mcp.json` | MCP-Server-Konfiguration |
| `AGENTS.md` | Projekt-Kontext für Codex CLI |
| `AGENTS.override.md` | Codex CLI Override-Datei |
| `.codex/AGENTS.md` | Projektspezifische Codex-Anweisungen |
| `GEMINI.md` | Projekt-Kontext für Gemini CLI |
| `docs/ai/*.md` | Tool-agnostische AI-Dokumentation |

Die vollständige Liste aller Checks steht in **[docs/checks.md](docs/checks.md)**.
Konzept und Hintergrund: **[docs/overview.md](docs/overview.md)**.
