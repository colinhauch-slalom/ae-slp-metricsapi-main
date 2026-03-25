# Roadmap Analysis Instructions

## Goal

Synthesize signals from the codebase into a prioritized view of what should happen next. Surface technical debt, in-flight work, and missing capabilities — then group them into actionable phases. This is a recommendation, not a project plan.

## Steps

1. Read `templates/ROADMAP.md` — its sections and comments define the output structure.
2. Gather signals from across the codebase:
   - **TODO / FIXME / HACK comments** — inline markers of known debt or deferred work
   - **Stub or placeholder code** — empty implementations, hardcoded values meant to be replaced, feature flags not yet active
   - **Findings from other topics** — if architecture, code-quality, security, or test-coverage analyses were run, pull the highest-priority items forward
   - **Missing capabilities** — things the README promises, the API implies, or the architecture suggests but the code doesn't yet implement
   - **Dependency currency** — notably outdated dependencies worth scheduling an upgrade for
3. Group items into phases (Near-term / Mid-term / Long-term) and note the rationale. Populate the template.

## Conciseness Rule

This is a prioritized highlight reel, not a full backlog. Each phase should have 3–6 items max. If there are more, flag the most impactful and note `> Drill-down available`.
