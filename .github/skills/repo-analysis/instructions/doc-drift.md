# Documentation Drift Analysis Instructions

## Goal

Audit the gap between what the documentation says and what the code actually does. Surface inaccuracies, stale references, missing coverage, and misleading content — at an overview level. This is not a copy-editing pass.

## Steps

1. Read `templates/DOC-DRIFT.md` — its sections and comments define the output structure and what to look for.
2. Inventory available documentation sources: README, inline comments, API docs (Swagger/OpenAPI), migration files, config schemas, changelogs, wikis, ADRs, and anything else that makes claims about the system.
3. For each source, check:
   - **Accuracy** — does it describe what the code currently does?
   - **Staleness** — does it reference things that no longer exist (old paths, removed features, renamed concepts)?
   - **Completeness** — are public interfaces, env vars, config options, or API endpoints undocumented?
   - **Coverage gaps** — significant areas of the codebase with no documentation at all?
4. Populate the template. Cite a representative file or section per finding; do not enumerate every stale line.

## Conciseness Rule

This is a drift audit, not a technical writing review. Flag the most impactful gaps and inaccuracies. If you find yourself listing individual sentences to correct, stop — summarize the pattern and offer a drill-down instead.
