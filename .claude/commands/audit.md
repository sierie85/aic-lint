# /audit — Claude Config Audit

Führt einen vollständigen, **lokalen** Audit der Claude-Konfigurationsdateien im aktuellen Projekt durch. Kein API-Zugriff, kein Netzwerk, kein API-Key nötig.

## Verwendung

```
/audit [--no-budget] [--json]
```

- Ohne Flags: alle Checks + Context-Budget (lokale Schätzung)
- `--no-budget`: Context-Budget-Tabelle weglassen
- `--json`: Maschinen-lesbarer JSON-Output (für CI)

## Was wird geprüft

- **CLAUDE.md** — Zeilenlänge, Struktur (##-Abschnitte), tote Pfadreferenzen
- **Skills** (`.claude/commands/*.md`) — H1-Titel, beschreibender Text, Überschneidungen, Frontmatter
- **Agents** (`.claude/agents/*.md`) — Frontmatter (name/description)
- **JSON-Configs** (`settings.json`, `settings.local.json`, `.mcp.json`) — valides JSON
- **AGENTS.md / GEMINI.md** — Vorhandensein, Konsistenz mit CLAUDE.md
- **/docs/ai/** — tool-agnostische AI-Basis vorhanden?
- **Redundanz** — gleiche Inhalte in CLAUDE.md und Skills (lokal, kein LLM)
- **Secret-Scan** — versehentlich eingecheckte API-Keys/Tokens
- **Context-Budget** — grobe lokale Token-Schätzung pro Datei

## Ausführung

```bash
cd /workspace/repos/audit_tool && npx tsx src/index.ts "$CLAUDE_PROJECT_ROOT"
```

Schnell ohne Budget-Tabelle:

```bash
cd /workspace/repos/audit_tool && npx tsx src/index.ts "$CLAUDE_PROJECT_ROOT" --no-budget
```

JSON für CI:

```bash
cd /workspace/repos/audit_tool && npx tsx src/index.ts "$CLAUDE_PROJECT_ROOT" --json
```

## Exit-Code

- `0` — Keine Fehler (Warnungen möglich)
- `1` — Mindestens ein ERROR gefunden
