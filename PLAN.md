# Metrics API — Repo Analysis Plan

> **Purpose**: Track the systematic analysis of this intentionally-flawed metrics API repo.  
> **Deliverable**: [FINDINGS.md](FINDINGS.md) — a severity-graded report of all discovered issues.  
> **Time budget**: ~30 minutes across 5 phases.

---

## Phase 1: README & Setup Verification (~5 min)

- [x] Read README.md end-to-end, note every setup claim
- [x] Verify referenced `.env.docker.example` file exists (or doesn't) — **it exists**, and contains DEF-001 (wrong Redis port 6380)
- [ ] Attempt `docker-compose up` — record any startup failures *(Phase 4)*
- [x] Identify hardcoded paths or machine-specific config in docker-compose.yml — DEF-009, DEF-010, DEF-011
- [x] Note any discrepancies between README-documented endpoints/params and actual code — `startTime`/`endTime` vs `start`/`end`; `avg` vs `average`
- [x] Record all findings

## Phase 2: Static Code Review (~10 min)

### Security
- [x] Check for hardcoded secrets/passwords across all config files — DEF-010
- [x] Check for authentication/authorization on all routes — **no auth anywhere**
- [x] Check Docker security (user context, exposed ports, password protection) — root user, Redis no password
- [x] Check for input sanitization and SQL injection vectors — parameterized queries used; no XSS sanitization
- [x] Check for rate limiting — **none**

### Logic Bugs
- [x] Review logger.ts — **DEF-013**: `<=` comparison inverted; errors suppressed at default `warn` level
- [x] Review AggregationEngine.ts — **DEF-002**: `Math.ceil` off-by-one in percentile; p100 rejected; undocumented `median` type found
- [x] Review health endpoint — **DEF-003**: always returns 200, no real checks
- [x] Review error handler — **DEF-012**: all errors return 500, even validation failures
- [x] Review config loading — validation errors from `validateAndApplyDefaults()` are never checked; app starts with invalid config

### Architecture & Dead Code
- [x] Identify unused services, models, and migrations — **DEF-014**: MetricMetadataService, AlertRuleService, and their models/migrations
- [x] Review plugin system for actual usage — **DEF-005**: ~460 lines, zero plugins registered
- [x] Review cache TTL configuration and effectiveness — **DEF-006**: 1s L1, 2s L2 guarantees misses; `KEYS` command blocks Redis
- [x] Review the ingestion pipeline layers for unnecessary complexity — **DEF-004**: 8 layers for a single DB insert; enricher metadata never persisted
- [x] Review MetricRouter routing strategy selection — always selects `'postgres'`; fallthrough cases are dead code

## Phase 3: Test Analysis (~5 min)

- [x] Run `npm test` and record results — **7 suites (1 fully skipped), 48 tests (30 passed, 18 skipped, 0 failed)**
- [x] Identify all `describe.skip` and `it.skip` instances — **DEF-015**: `MetricValidator.test.ts` entirely `describe.skip`; 4/6 CacheManager tests skipped; 3/6 integration tests skipped
- [x] Check for misnamed test files — **DEF-016**: `MetricService.test.ts` imports and tests `MetricController`
- [x] Check for tests that validate buggy behavior as correct — `AggregationEngine.test.ts` asserts the off-by-one percentile result as the expected answer
- [x] Check integration tests for use of mocks vs real app — integration tests create a fresh Express app with hardcoded mock handlers; test mock behavior, not real app
- [x] List modules with zero test coverage — MetricNormalizer, MetricEnricher, MetricRouter, StorageAdapter, PostgresStorageProvider, ConfigProvider, ConfigResolver, ConfigValidator, errorHandler, PluginLifecycleManager, PluginRegistry, AlertRuleService, MetricMetadataService

## Phase 4: Runtime Exploration (~5 min)

- [ ] Fix docker-compose.yml enough to boot (volume mount, health check path)
- [ ] Start the application via Docker
- [ ] `GET /v1/health` — confirm always-200 behavior
- [ ] `POST /v1/metrics` with valid payload — verify ingestion
- [ ] `GET /v1/metrics/query` with correct params (`start`/`end`) — verify query
- [ ] `GET /v1/metrics/query` with README params (`startTime`/`endTime`) — verify failure
- [ ] Send invalid inputs — observe error handler returning 500 for everything
- [ ] Check Redis/Postgres directly to verify what's stored

## Phase 5: Swagger & Documentation Audit (~5 min)

- [x] Compare swagger.json routes against actual v1.ts routes — **DEF-008**: swagger documents `/metrics/ingest` and `/metrics/query`; actual routes are `/v1/metrics` and `/v1/metrics/query`
- [x] Identify documented parameters that don't exist in code — swagger documents `granularity` and `fill` params; neither is implemented
- [x] Compare version numbers across swagger.json and package.json — swagger: `0.9.0`; package.json: `0.1.0`
- [x] Verify README claims about config format support — README claims YAML/TOML support; neither parser package is in `package.json`; only `env` format is used at startup
- [x] Verify README claims about aggregation types — README lists `avg, p50, p90, p95, p99`; actual: `sum, average, percentile, median`
- [x] Verify README claims about cache performance — README claims "optimal read performance"; 1-2s TTLs mean every real query misses the cache

---

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1. README & Setup | ✅ Complete | DEF-001, DEF-008, DEF-009, DEF-010, DEF-011; param name mismatches found |
| 2. Static Review | ✅ Complete | 16 labeled defects + 10 unlabeled issues found |
| 3. Test Analysis | ✅ Complete | 30 pass / 18 skip / 0 fail; DEF-015, DEF-016 confirmed |
| 4. Runtime Exploration | 🔲 Not Started | Requires Docker or local postgres/redis |
| 5. Swagger & Docs Audit | ✅ Complete | DEF-008 + phantom params + version mismatch |
| Final: Compile FINDINGS.md | 🔄 In Progress | |

---

## Key Observations

- The README may not be reliable — treat every claim as unverified.
- Git history is minimal — no useful information can be gained from commits.
- Issues may be intentionally designed to mislead analysis tools (AI agents).

**Meta-observation — Embedded Answer Key:** Every intentional defect is labeled with a `[DEF-XXX]` comment directly in the source code. There are 16 labeled defects (DEF-001 through DEF-016). An AI agent reading the source will immediately see these labels. The interesting analytical question is: are there issues beyond what the labels describe?

**Unlabeled issues found (not in the DEF-XXX system):**
1. Undocumented `median` aggregation type — implemented in `AggregationEngine.ts`, not in README, swagger, or validator
2. Missing YAML/TOML parser packages — claimed in `ConfigProvider.ts`, not in `package.json`
3. `lint` script is a no-op — just echoes a message
4. No `.dockerignore` — full working directory copied into Docker build context
5. `MetricEnricher` computes metadata that is discarded before DB insert
6. Integration tests verify mock handler behavior, not the real application
7. README documents `startTime`/`endTime` query params; implementation uses `start`/`end`
8. README documents `avg` aggregation; implementation uses `average`
9. No rate limiting on ingest or query endpoints
10. Redis exposed with no password in docker-compose

**Key traps for AI analysis:**
- Logger bug (DEF-013) silently suppresses `error`-level logs — runtime debugging via logs will be misleading
- `MetricService.test.ts` tests `MetricController` — file name is a lie
- Integration tests use a mock Express app — they look like real integration tests but verify nothing real
- `AggregationEngine.test.ts` asserts the *wrong* answer as correct — passing tests do not mean correct behavior
- The enricher looks functional but discards all computed data
