# Code Quality Analysis Instructions

## Goal

Produce a concise, high-level code quality snapshot. Flag the most important concerns with enough specificity to act on. Do **not** produce an exhaustive linting report — if the user wants that, they can run the linter.

## Steps

1. Read `templates/CODE-QUALITY.md` — its sections and comments define exactly what to look for and how to present findings.
2. Scan the source with these areas in mind:
   - **Complexity hotspots** — functions or modules doing too much
   - **Error handling** — swallowed silently, logged-and-continued, or propagated with context?
   - **Consistency** — naming, async style, DI/config patterns applied unevenly
   - **Dead code** — unused exports, imports, commented-out blocks, unreachable branches
   - **Coupling & cohesion** — cross-layer imports, God objects, poorly scoped modules
   - **Type safety** — `any` escapes, unsafe casts, missing null checks in critical paths
   - **Anti-patterns** — language/framework-specific smells; be specific to the stack
3. Populate the template. Call out specific files as representative examples only — do not enumerate every occurrence.

## Conciseness Rule

This is an overview, not a code review. If you find yourself writing more than a short paragraph for any section, you have gone too deep. Summarize and offer a drill-down instead.
