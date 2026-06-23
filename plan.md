# Plan: Claude Config Audit Tool

## Kontext für neue Session

Dieses Dokument ist der Startpunkt für die Implementierung eines Audit-Tools
das CLAUDE.md, Skills, Agents und Docs eines Projekts auf Qualität, Redundanz
und Zusammenhänge prüft.

Hintergrund-Research: siehe `tool_audit_idea.md`

---

## Was das Tool tun soll

```
Input:  Projektverzeichnis
Output: Markdown-Report mit priorisierten Problemen und Verbesserungen
```

### Prüfpunkte

**Struktur:**
- [ ] CLAUDE.md vorhanden? Auf allen relevanten Ebenen (root, subdirs)?
- [ ] Skills unter `.claude/commands/` vorhanden?
- [ ] Multi-Tool: AGENTS.md, GEMINI.md vorhanden wenn Team gemischt?
- [ ] Tool-agnostische Basis `/docs/ai/` vorhanden?

**Qualität:**
- [ ] CLAUDE.md zu lang? (> 80 Zeilen = Warnung, > 150 Zeilen = Fehler)
- [ ] Redundanzen: steht etwas in CLAUDE.md das auch in einem Skill steht?
- [ ] Skill-Overlap: zwei Skills die dasselbe Thema abdecken?
- [ ] Tote Referenzen: Dateipfade in CLAUDE.md/Skills die nicht existieren?
- [ ] Fehlende Skills: erkennbare Domains ohne eigenen Skill?

**Token-Overhead:**
- [ ] Token-Schätzung pro Layer (CLAUDE.md, jeder Skill, geladene Dateien)
- [ ] Gesamter statischer Context beim Session-Start
- [ ] Kostenschätzung bei X Requests/Tag (Opus-Preise)

**Multi-Tool-Parität:**
- [ ] CLAUDE.md vs. AGENTS.md: fehlen kritische Infos in einer der Dateien?
- [ ] Skills haben kein Äquivalent für Codex/Gemini-Nutzer?

---

## Technologie

```
Sprache:     Python
SDK:         anthropic (für Token-Counting + finale Analyse)
Output:      Markdown-Report
Interface:   CLI (python audit.py /path/to/project)
             optional: /audit Skill für Claude Code
```

---

## Architektur

```
audit.py
├── collector.py     → alle Config-Dateien einlesen
├── analyzer.py      → strukturelle Checks (Länge, tote Refs, Overlap)
├── token_counter.py → Token-Schätzung via Anthropic count_tokens API
├── llm_reviewer.py  → Claude analysiert Redundanzen + Verbesserungen
└── reporter.py      → Markdown-Report generieren
```

---

## Implementierungsschritte

### Schritt 1 — Collector

```python
# Liest alle relevanten Dateien ein
def collect(project_root: str) -> ProjectConfig:
    return ProjectConfig(
        claude_md_files=[...],   # alle CLAUDE.md Ebenen
        skills=[...],            # .claude/commands/*.md
        agents_md=...,           # AGENTS.md falls vorhanden
        gemini_md=...,           # GEMINI.md falls vorhanden
        ai_docs=[...],           # /docs/ai/*.md falls vorhanden
    )
```

### Schritt 2 — Strukturelle Checks (ohne LLM, schnell)

```python
def check_structure(config: ProjectConfig) -> list[Finding]:
    findings = []

    # Länge
    for f in config.claude_md_files:
        if f.line_count > 150:
            findings.append(Finding("ERROR", f"CLAUDE.md hat {f.line_count} Zeilen"))

    # Tote Referenzen
    for ref in extract_file_refs(config.claude_md_files):
        if not Path(ref).exists():
            findings.append(Finding("ERROR", f"Toter Pfad: {ref}"))

    # Multi-Tool Parität
    if config.agents_md and not config.claude_md:
        findings.append(Finding("WARN", "AGENTS.md vorhanden aber keine CLAUDE.md"))

    return findings
```

### Schritt 3 — Token-Counting

```python
import anthropic

client = anthropic.Anthropic()

def count_tokens(text: str) -> int:
    response = client.messages.count_tokens(
        model="claude-opus-4-8",
        messages=[{"role": "user", "content": text}]
    )
    return response.input_tokens

def estimate_session_cost(config: ProjectConfig) -> TokenReport:
    claude_md_tokens = sum(count_tokens(f.content) for f in config.claude_md_files)
    skill_tokens = {s.name: count_tokens(s.content) for s in config.skills}

    total = claude_md_tokens + sum(skill_tokens.values())
    cost_per_request = (total / 1_000_000) * 5.00  # Opus Input-Preis

    return TokenReport(
        claude_md=claude_md_tokens,
        skills=skill_tokens,
        total_static=total,
        cost_per_request=cost_per_request,
        cost_per_100_requests=cost_per_request * 100,
    )
```

### Schritt 4 — LLM-Review (Redundanzen, fehlende Skills)

```python
def llm_review(config: ProjectConfig) -> str:
    all_content = format_for_review(config)

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""Analysiere diese Claude-Projekt-Konfiguration:

{all_content}

Prüfe und berichte:
1. Redundanzen zwischen CLAUDE.md und Skills (exakt benennen)
2. Überschneidungen zwischen Skills
3. Erkennbare Domains ohne eigenen Skill
4. Ist der Inhalt korrekt auf CLAUDE.md vs. Skills verteilt?
   (CLAUDE.md = immer nötig, Skills = aufgabenspezifisch)
5. Top 3 priorisierte Verbesserungen

Format: Markdown mit klaren Abschnitten."""
        }]
    )
    return response.content[0].text
```

### Schritt 5 — Report generieren

```markdown
# Audit Report — /path/to/project
Erstellt: 2026-06-22

## Token-Overhead (statischer Context pro Session)
| Layer | Tokens | Kosten/Request |
|---|---|---|
| CLAUDE.md (root) | 3.200 | $0.016 |
| CLAUDE.md (src/) | 800 | $0.004 |
| Skill: testing | 1.400 | $0.007 |
| ... | | |
| **Gesamt** | **12.400** | **$0.062** |

Bei 100 Requests/Tag: ~$6.20/Tag nur für statischen Context

## Fehler (beheben vor nächster Session)
- ❌ CLAUDE.md root: 187 Zeilen (empfohlen: < 80)
- ❌ Toter Pfad in testing.md: `/src/helpers/test-utils.ts` existiert nicht

## Warnungen
- ⚠️  testing.md und qa.md überschneiden sich (beide beschreiben Jest-Setup)
- ⚠️  Keine AGENTS.md — Codex-Nutzer im Team haben keinen Context

## Verbesserungen (LLM-Analyse)
1. ...
2. ...
3. ...
```

---

## Session-Start Checkliste

Wenn du diese Implementierung in einer neuen Session aufnimmst:

1. Lies zuerst: `tool_audit_idea.md` (Hintergrund + Ideen)
2. Lies: `best_practices_claude_code_context.md` (was das Tool prüfen soll)
3. Lies: `large_project_context_strategy.md` (Multi-Tool-Kontext)
4. Starte mit Schritt 1 (Collector) — der Rest baut darauf auf
5. Testprojekt: dieses Repo (`/workspace/repos/_research`) als erstes Testziel

---

## Offene Entscheidungen

- [ ] Soll das Tool auch als `/audit` Skill für Claude Code verfügbar sein?
- [ ] Soll es eine Watch-Mode geben (bei Dateiänderungen neu prüfen)?
- [ ] Welches Ausgabeformat bevorzugt? (Markdown / JSON / Terminal-Output)
- [ ] Soll es Ollama-Kompatibilität prüfen (Context-Window-Größe)?
