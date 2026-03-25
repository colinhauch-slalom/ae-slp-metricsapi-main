# Knowledge Gaps Analysis Instructions

## Goal

Identify where knowledge is concentrated, implicit, or absent — the things a new contributor could not learn from the codebase alone. Surface onboarding risks and single points of failure.

## Steps

1. Read `templates/KNOWLEDGE-GAPS.md` — its sections and comments define the output structure and what to look for.
2. Explore the codebase with these areas in mind:
   - **Undocumented modules** — source areas with no comments, no docs, and no tests to infer intent from
   - **Implicit conventions** — patterns that are applied consistently but never explained (naming, error handling style, data flow assumptions)
   - **Single points of knowledge** — complex or critical code that appears to have been written by one person with no redundant explanation
   - **Onboarding blockers** — things a new contributor would need to know that aren't discoverable from the repo (tribal knowledge, external dependencies, required setup not in docs)
   - **Fragile or opaque areas** — code that is difficult to change safely because its behavior or invariants are unclear
3. Populate the template. Be specific enough to be actionable; this is a risk map, not an inventory.

## Conciseness Rule

Focus on the gaps with the highest onboarding or maintenance cost. A new contributor should be able to read this and know exactly where to be careful and what to ask about.
