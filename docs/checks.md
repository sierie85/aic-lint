# Check-Referenz

Alle Checks laufen rein lokal und deterministisch. Jeder Befund hat eine Stufe:
**ERROR** (Exit-Code 1), **WARN** oder **INFO**.

## Struktur & Qualität

### CLAUDE.md vorhanden
- **Stufe:** WARN
- Warnt, wenn im Projekt keine `CLAUDE.md` gefunden wird.

### CLAUDE.md-Länge
- **Stufe:** WARN (> 80 Zeilen) · ERROR (> 150 Zeilen)
- Lange `CLAUDE.md` kostet bei jeder Session Context. Empfehlung: < 80 Zeilen.

### CLAUDE.md-Struktur
- **Stufe:** WARN
- Eine `CLAUDE.md` mit > 20 Zeilen ohne einen einzigen `##`-Abschnitt gilt als
  unstrukturierter Fließtext.

### Tote Referenzen
- **Stufe:** ERROR
- Datei-Pfade in Backticks (z. B. `` `src/foo.ts` ``) oder Markdown-Links, die im
  Projekt nicht existieren. URLs, Anker (`#...`) und Globs werden ignoriert.
- Geprüft in: `CLAUDE.md`, Skills, `AGENTS.md`.

### Skill-Qualität
- **Stufe:** WARN
- Ein Skill (> 10 Zeilen) ohne H1-Titel **oder** ohne beschreibenden Prosatext
  (nur Code-Blöcke) ist für Claude schwer einzuordnen.

### Skill-Überschneidung
- **Stufe:** WARN
- Zwei Skills, die **2 oder mehr identische `##`-Überschriften** teilen, decken
  vermutlich dasselbe Thema ab.

### Redundanz
- **Stufe:** WARN
- Dieselbe inhaltliche Zeile (≥ 40 Zeichen, normalisiert) steht in mehreren Dateien
  gleichzeitig — z. B. in `CLAUDE.md` *und* einem Skill. Headings, Code-Blöcke und
  kurze Zeilen werden ausgenommen.

## Multi-Tool-Parität

### AGENTS.md ↔ CLAUDE.md
- **Stufe:** WARN / INFO
- WARN: `AGENTS.md` vorhanden, aber keine `CLAUDE.md`.
- INFO: `CLAUDE.md` vorhanden, aber keine `AGENTS.md` (Codex-Nutzer ohne Context).

### docs/ai vorhanden
- **Stufe:** INFO
- Empfiehlt eine tool-agnostische AI-Basis unter `docs/ai/`.

## Frontmatter

### Command-Frontmatter
- **Stufe:** WARN / INFO
- WARN: Frontmatter-Block geöffnet, aber nicht mit `---` geschlossen.
- INFO: gültiges Frontmatter ohne `description`.

### Agent-Frontmatter
- **Stufe:** WARN
- Warnt, wenn ein Agent (`.claude/agents/*.md`) **kein** Frontmatter hat, es nicht
  geschlossen ist, oder die Felder `name` / `description` fehlen.

## Config-Validität

### JSON-Configs
- **Stufe:** ERROR
- `.claude/settings.json`, `.claude/settings.local.json` und `.mcp.json` werden auf
  gültiges JSON geprüft. Ein Syntaxfehler ist ein ERROR.

## Sicherheit

### Secret-Scan
- **Stufe:** ERROR
- Durchsucht alle eingelesenen Dateien nach Mustern, die wie echte Geheimnisse
  aussehen. Treffer werden in der Ausgabe **redacted** (z. B. `sk-a…yz`).
- Erkannte Typen: Anthropic-, OpenAI-, AWS-, GitHub-, Slack-, Google-Keys sowie
  Private-Key-Header (`-----BEGIN ... PRIVATE KEY-----`).

---

## Übersicht

| Check | Stufe |
|---|---|
| CLAUDE.md vorhanden | WARN |
| CLAUDE.md-Länge | WARN / ERROR |
| CLAUDE.md-Struktur | WARN |
| Tote Referenzen | ERROR |
| Skill-Qualität | WARN |
| Skill-Überschneidung | WARN |
| Redundanz | WARN |
| AGENTS.md ↔ CLAUDE.md | WARN / INFO |
| docs/ai vorhanden | INFO |
| Command-Frontmatter | WARN / INFO |
| Agent-Frontmatter | WARN |
| JSON-Configs | ERROR |
| Secret-Scan | ERROR |
