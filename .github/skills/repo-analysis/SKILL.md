---
name: repo-analysis
description: Analyze an existing codebase and produce structured findings documents. Topics include architecture, code quality, documentation drift, security, test coverage, knowledge gaps, and roadmap. User specifies which topics to run and any focus areas; the skill writes output files into the repo.
---

# Repo Analysis Skill

Produce a concise, high-level analysis of the current repository. For each requested topic, read the corresponding instructions file, explore the codebase, then populate the corresponding template and write it as a file.

**Default posture: breadth over depth.** Flag areas that warrant deeper investigation rather than expanding them inline. Every output should be skimmable in minutes. The user can request a deeper dive into any section at any time.

## Invocation

The user will specify:
- **Topics** — one or more by name, or `all`
- **Focus areas** (optional) — specific concerns, files, or patterns to pay extra attention to

Example: `analyze this repo: architecture, security — pay attention to auth and the plugin system`

## Available Topics

| Topic | Instructions | Template | Output file |
|---|---|---|---|
| `architecture` | `instructions/architecture.md` | `templates/ARCHITECTURE.md` | `analysis-docs/ARCHITECTURE.md` |
| `code-quality` | `instructions/code-quality.md` | `templates/CODE-QUALITY.md` | `analysis-docs/CODE-QUALITY.md` |
| `doc-drift` | `instructions/doc-drift.md` | `templates/DOC-DRIFT.md` | `analysis-docs/DOC-DRIFT.md` |
| `security` | `instructions/security.md` | `templates/SECURITY.md` | `analysis-docs/SECURITY.md` |
| `test-coverage` | `instructions/test-coverage.md` | `templates/TEST-COVERAGE.md` | `analysis-docs/TEST-COVERAGE.md` |
| `knowledge-gaps` | `instructions/knowledge-gaps.md` | `templates/KNOWLEDGE-GAPS.md` | `analysis-docs/KNOWLEDGE-GAPS.md` |
| `roadmap` | `instructions/roadmap.md` | `templates/ROADMAP.md` | `analysis-docs/ROADMAP.md` |

A `analysis-docs/SUMMARY.md` is always written last, synthesizing all completed topics. Its instructions are in `instructions/summary.md` and its template in `templates/SUMMARY.md`.

## Execution Steps

For each requested topic, in order:
1. Read the topic's instructions file
2. Read the topic's template file — its sections and comments guide what to look for during exploration
3. Explore the codebase as needed (source, tests, config, docs, migrations, infra)
4. Write the populated template to the output path, committing all findings with file+line citations where applicable
5. After all topics are done, write `docs/analysis/SUMMARY.md`

## Depth & Drill-down

All topics default to **concise and high-level**: 2–5 bullet points or a small table per section, with a `> Drill-down available` callout for anything that warrants more detail. Do not expand a section inline unless explicitly asked.

The user may:
- Specify focus areas at invocation time to direct extra attention
- Ask for a deeper dive on any section after reviewing the initial output
- Request a full re-run of any topic with expanded detail
