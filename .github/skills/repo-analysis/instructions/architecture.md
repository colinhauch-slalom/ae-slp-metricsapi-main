# Architecture Analysis Instructions

## Goal

Produce a concise, high-level architecture snapshot of the repo. Prefer breadth over depth — flag areas worth drilling into rather than expanding them inline. The reader should be able to understand the system in 5 minutes.

## What to Explore

Start by identifying the language and ecosystem, then look for the equivalent of:

- **Dependency manifest** — `package.json`, `pom.xml`, `go.mod`, `requirements.txt`, `Gemfile`, `Cargo.toml`, `.csproj`, etc.
- **Entry points** — whatever bootstraps or starts the application: `main.*`, `index.*`, `app.*`, `server.*`, `handler.*`, `__main__.py`, `Program.cs`, `Application.java`, etc.
- **Top-level structure** — folder layout, module boundaries, package/namespace organization
- **Layering** — how request handling, business logic, and data access are separated (or not)
- **Config and environment** — how configuration enters the system (env vars, config files, secrets)
- **Data layer** — schema definitions, migrations, ORMs, storage abstractions
- **Extension points** — interfaces, adapters, plugins, hooks, event buses, middleware chains
- **Infrastructure** — Dockerfile, compose files, CI/CD pipelines, cloud config, IaC
- **Test layout** — where tests live and what patterns are used (not quality — that's a separate topic)
- **Existing docs** — README, ADRs, wikis, inline architecture comments

## What to Produce

Populate the template sections. For each section:
- Write 2–5 tight bullet points or a small table, not paragraphs
- Cite specific files where useful (no line numbers needed unless critical)
- If a section doesn't apply, write `N/A — [reason]`

## Diagram

Choose the diagram type that best communicates this codebase (component, C4 container, sequence for a key flow, or a combination). You may:
- Embed a Mermaid block directly in the template
- Create a companion `analysis-docs/ARCHITECTURE.mmd` file alongside the main doc
- Or both — use your judgment based on complexity

If the right diagram type is unclear, surface a brief question to the user before proceeding.

## Conciseness Rule

If you find yourself writing more than ~5 bullets in any section, stop and instead write a very short summary + a `> Drill-down available` callout. The user can ask for more detail on that section separately.
