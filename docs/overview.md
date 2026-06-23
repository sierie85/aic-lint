# Produktbeschreibung: Claude Config Audit Tool

## Das Problem

Claude-Code-Projekte sammeln mit der Zeit Konfiguration an: eine oder mehrere
`CLAUDE.md`, eigene Slash-Commands unter `.claude/commands/`, Subagents,
`settings.json`, MCP-Server, dazu `AGENTS.md`/`GEMINI.md` für gemischte Teams.

Diese Dateien werden selten systematisch gepflegt. Typische Probleme:

- **Aufgeblähte `CLAUDE.md`** — wächst unkontrolliert, kostet bei jeder Session Context
- **Redundanz** — dieselbe Anweisung steht in `CLAUDE.md` *und* in einem Skill
- **Tote Referenzen** — Pfade zeigen auf Dateien, die längst umbenannt/gelöscht sind
- **Schwache Skills** — Command ohne Beschreibung, Agent ohne Frontmatter
- **Kaputte Configs** — `settings.json` mit Syntaxfehler bricht still
- **Geleakte Secrets** — ein API-Key landet versehentlich in einer Config-Datei

## Die Lösung

Ein **lokaler, deterministischer Linter** speziell für die Claude-Konfiguration —
gewissermaßen „ESLint für `.claude/`". Er liest alle relevanten Dateien ein, prüft
sie gegen eine Reihe statischer Regeln und gibt einen priorisierten Report aus.

## Designprinzipien

### 1. Komplett lokal, keine API

Das Tool macht **keinen einzigen Netzwerk-Call**. Es braucht weder einen
Anthropic-API-Key noch ein Abo. Das hat zwei Gründe:

- **Zugang** — der Anthropic-API ist ein separates, kostenpflichtiges Produkt;
  ein Claude-Pro/Max-Abo schaltet ihn *nicht* frei.
- **Determinismus** — gleiche Eingabe liefert immer dasselbe Ergebnis, ideal für CI.

Der einzige Punkt, der früher den API brauchte (exaktes Token-Zählen), ist durch
eine **lokale Schätzung** ersetzt (siehe „Context-Budget").

### 2. Null Runtime-Dependencies

Außer `tsx`/`typescript` (Dev-Tooling) hat das Tool keine Abhängigkeiten. Selbst
Frontmatter-Parsing und Secret-Scanning sind dependency-frei implementiert. Das
hält das Tool klein, portabel und auditierbar.

### 3. Severity-basierte Findings

Jeder Befund hat eine Stufe:

- **ERROR** — sollte vor der nächsten Session behoben werden (führt zu Exit-Code 1)
- **WARN** — Qualitätsproblem, sollte angeschaut werden
- **INFO** — Hinweis / Empfehlung

## Architektur

Eine schlanke Pipeline:

```
collect  →  analyze  →  (estimate)  →  report
```

| Schritt | Modul | Aufgabe |
|---|---|---|
| collect | `collect.ts` | Alle Config-Dateien einlesen → `ProjectConfig` |
| analyze | `analyze.ts` | Statische Checks ausführen → `Finding[]` |
| estimate | `estimate.ts` | Lokale Token-Schätzung → `ContextBudget` |
| report | `report.ts` | Markdown-Report rendern |

`audit.ts` orchestriert die Schritte und liefert ein strukturiertes `AuditResult`,
das `index.ts` dann als Markdown oder JSON ausgibt.

## Context-Budget (lokale Schätzung)

Anthropic veröffentlicht keinen Offline-Tokenizer für Claude 3/4 — exakte
Token-Zahlen sind ohne API nicht möglich. Das Tool schätzt daher das Context-Budget
über eine Heuristik (Mischung aus Zeichen- und Wortzahl). Die Zahlen sind als
**Schätzung** markiert und eignen sich vor allem für den *relativen* Vergleich
(„welche Datei ist die schwerste?"), nicht als exakte Abrechnungsgrundlage.

## Nutzungsformen

- **CLI** — direkt im Terminal, Markdown oder `--json`
- **`/audit`-Skill** — innerhalb von Claude Code
- **CI-Gate** — via Exit-Code und `--json`

## Abgrenzung

Das Tool ersetzt **kein** LLM-Review. Es prüft, was sich statisch und zuverlässig
prüfen lässt. Inhaltliche Bewertung („ist diese Anweisung sinnvoll formuliert?")
bleibt bewusst außen vor, weil das einen API-Call erfordern würde — und genau das
ist hier ein Nicht-Ziel.
