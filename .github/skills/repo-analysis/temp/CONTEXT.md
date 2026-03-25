# repo-analysis Skill — Context & Design Intent

Use this document as a starting prompt when building out new or remaining analysis modules (instructions + templates). It captures the goals, design principles, and decisions already established.

---

## What This Skill Is

A structured, agentic workflow for producing repo analysis documents. The user invokes it by naming one or more topics (`architecture`, `code-quality`, `security`, etc.). For each topic, the agent reads an instructions file, reads the corresponding template, explores the codebase, then writes a populated output file to `analysis-docs/`.

The skill lives in `.github/skills/repo-analysis/` and is composed of:
- `SKILL.md` — top-level orchestration: invocation, topic table, execution steps
- `instructions/<topic>.md` — agent guidance for each topic (what to look for, how deep to go)
- `templates/<TOPIC>.md` — the output skeleton (structure + inline comments as agent prompts)
- deliverable files are kept at the root of the project: `analysis-docs/<TOPIC>.md` — written output (generated at analysis time, not part of the skill itself)

---

## Core Design Principles

**Breadth over depth by default.**
Every analysis runs at overview level — skimmable in minutes. If a section warrants more detail, the agent flags it with a `> Drill-down available` callout. The user asks for a deeper dive explicitly; the agent never expands inline unless asked.

**The template is the source of truth for output structure.**
Instructions files are lean — they tell the agent *what to look for* and *how to behave*, not what sections to produce. Section definitions, formatting rules, and inline guidance belong in the template as comments. This keeps the instructions DRY and makes the output predictable.

**Instructions and template are read before exploration.**
The SKILL.md execution order is: read instructions → read template → explore codebase → write output. The template informs what to look for during exploration, not just how to format the result.

**No exhaustive enumerations.**
The agent cites representative examples (a file or two) rather than listing every affected file or every occurrence of a pattern. If something needs a complete list, that's a drill-down.

**Drill-down is a first-class feature.**
Every section caps at ~2–5 bullets. Anything more becomes a summary + `> Drill-down available`. The user can request a deeper pass on any section separately, or re-run a topic with expanded detail.

---

## Decisions Made Per Module

### SKILL.md
- Step 2 was rephrased to make the template-first intent explicit: *"its sections and comments guide what to look for during exploration"*
- The topic table maps each topic to its instructions, template, and output path for easy reference
- The final step produces a `SUMMARY.md` synthesizing all completed topics

### architecture
- Instructions style: verbose "What to Explore" and "What to Produce" — this was the first module and predates the principle of keeping instructions lean. It works well but is slightly more detailed than the code-quality pattern.
- Template has rich inline comments per section; closes with `Notable Observations` and `Follow-up & Open Questions` sections
- Diagram section lets the agent choose the best diagram type (Mermaid embedded or companion `.mmd` file)

### code-quality
- Instructions were deliberately slimmed after establishing the template-first pattern:
  - Severity grade table removed from instructions (it lives in the template so readers see it in the output)
  - "What to Explore" collapsed to a lean bullet list with no redundant elaboration
  - "What to Produce" replaced with a pointer to the template
- Template opens with a **Severity Key** table (grades always visible to the reader without cross-referencing)
- Template has a **Health Summary** table — one row per concern, one column for grade, one for a one-line verdict — so the output is scannable at a glance before reading section detail
- Closes with `Notable Observations` and `Follow-up & Open Questions` (same tail as architecture)

---

## Severity Grades (established in code-quality, reuse for any graded topic)

| Grade | Meaning |
|---|---|
| 🔴 Critical | Likely bug, data loss risk, or severe maintainability blocker. Fix before next release. |
| 🟡 Warning | Code smell or pattern that will cause pain as the codebase grows. Worth scheduling. |
| 🔵 Info | Minor issue or improvement opportunity with low practical impact. |

---

## Patterns to Carry Forward

When building the remaining modules (`doc-drift`, `security`, `test-coverage`, `knowledge-gaps`, `roadmap`, `summary`), follow these patterns:

1. **Instructions file** — 3-step structure: Goal → Steps (read template, scan codebase, populate) → Conciseness Rule. Keep it short. Don't repeat what the template already says.

2. **Template file** — owns the output structure. Use inline `<!-- comments -->` as agent prompts per section. Cap section guidance at one tight sentence. Include a `Notable Observations` and `Follow-up & Open Questions` tail.

3. **Graded topics** (security, code-quality) — include a Severity Key table at the top of the template and a Summary/Health table immediately after it. Always include the severity key. 

4. **Non-graded topics** (architecture, doc-drift, roadmap) — open with a metadata header (`Repo`, `Date`, `Stack`) and go straight into sections.

5. **Conciseness rule** — always repeated in the instructions file, even briefly. It's the most important behavioral constraint.

---

## Questions the User Has Been Asking

These reflect the kinds of judgment calls that shaped the design — useful reference when making similar decisions for remaining modules:

- *How specific should citations be?* → Files as representative examples; no line numbers required unless something specific needs to be called out. No exhaustive file lists.
- *How much detail in the initial analysis?* → Overview only. If the user wants a linting report they can run the linter. The skill is for orientation, not audit.
- *Where does section guidance live — instructions or template?* → Template. Instructions tell the agent how to behave; templates define what to produce.
- *Should the instructions repeat the template's structure?* → No. DRY. The instructions point to the template; the template owns the structure.
- *What should the tail of every output look like?* → `Notable Observations` + `Follow-up & Open Questions`, matching the architecture template pattern.
