# Test Coverage Analysis Instructions

## Goal

Assess the quality and completeness of the test suite at an overview level. Flag what is well-tested, what is missing, and where the tests themselves may be unreliable. This is not a coverage-percentage report — it's a structural assessment.

## Steps

1. Read `templates/TEST-COVERAGE.md` — its sections and comments define the output structure and what to look for.
2. Explore the test layout and the source with these areas in mind:
   - **Test inventory** — what kinds of tests exist (unit, integration, e2e), where they live, what framework/runner is used
   - **Coverage by module** — which source modules have meaningful tests and which have none or token tests
   - **Test quality signals** — skipped/disabled tests, assertions that can never fail, tests that test implementation rather than behavior
   - **Mocking strategy** — are external dependencies (DB, network, time) properly isolated, or do tests rely on real infrastructure?
   - **Critical path coverage** — are the most important or riskiest flows (auth, data writes, error handling) tested?
3. Populate the template. Call out specific modules or test files as examples; do not enumerate every test.

## Conciseness Rule

Do not produce a line-by-line test review. Flag structural patterns: whole modules missing coverage, a testing anti-pattern applied broadly, or a critical path with no tests. Offer drill-downs for anything needing more detail.
