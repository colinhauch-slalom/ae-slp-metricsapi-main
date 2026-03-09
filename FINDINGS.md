# Metrics API — Analysis Findings

> **Repo**: ae-slp-metricsapi-main  
> **Date**: 2026-03-09  
> **Analyst**: Colin Hauch  

---

## Findings Summary

This document presents a comprehensive analysis of the `ae-slp-metricsapi-main` repository — a Node.js/TypeScript metrics ingestion and query API backed by PostgreSQL and Redis, orchestrated via Docker Compose.

### What Was Explored

The analysis covered four areas:

1. **Static code review** — all source files, configuration, Docker infrastructure, and documentation
2. **Test suite analysis** — all 7 test suites (48 tests), including skipped tests and correctness of assertions
3. **Docker Compose operability** — whether the application can actually be built and run as documented
4. **Runtime behavior** — live endpoint testing via Docker Compose to verify ingest, query, and health check behavior

### What Was Found

**30 findings** were identified across all severity levels:

| Severity | Count | Highlights |
|----------|-------|------------|
| 🔴 Critical | 5 | No authentication, hardcoded credentials, no rate limiting, Redis exposed without a password, container runs as root |
| 🟠 High | 6 | Logger silently drops all errors, all HTTP errors return 500, health check is a no-op, percentile calculation is wrong |
| 🟡 Medium | 10 | Documentation doesn't match implementation, ~900 lines of dead code (unused plugin system, services, models), over-engineered config and ingestion pipeline, cache TTLs effectively disable caching |
| 🟢 Low | 9 | Misnamed test files, skipped test suites, no linter, no `.dockerignore`, swagger version mismatch |

The repo also contains an embedded answer key — every intentional defect is labeled with a `[DEF-XXX]` comment in the source code (DEF-001 through DEF-016). This analysis identified all 16 labeled defects plus 14 additional unlabeled issues.

**Test suite state**: 48 tests total — 30 pass, 18 are skipped, 0 fail. However, passing tests do not mean correct behavior: the AggregationEngine tests assert a buggy percentile calculation as the expected result, and the integration tests verify their own mock handlers rather than the real application.

**Docker operability**: The application could not run out of the box. Three fixes were required — a wrong Redis port, a macOS-specific health check path, and a hardcoded volume mount to the original author's machine. After applying these fixes, Docker Compose starts successfully.

**Runtime behavior**: Both the ingest and query endpoints return HTTP 500 to clients despite the underlying operations completing successfully (data is persisted, queries execute). The error middleware catches something in the response chain and masks the real result. The health endpoint works but is meaningless — it always returns 200 regardless of dependency state.

### Conclusion

This codebase has significant security gaps (no auth, exposed credentials), functional bugs that affect every API response (logger inversion, blanket 500 errors), and substantial dead code that adds complexity without value. The documentation (README, Swagger) actively misleads consumers with wrong parameter names and routes. The test suite provides false confidence — green tests mask incorrect behavior, and critical paths have zero coverage.

For a production deployment, the critical security issues (CRIT-1 through CRIT-5) and the functional bugs affecting every request (HIGH-1, HIGH-4) would need to be addressed first. The dead code (plugin system, unused services, over-engineered config) should be removed to reduce maintenance burden. The test suite needs significant rework — unskipping disabled tests, fixing incorrect assertions, and replacing mock-based integration tests with real application tests.

---

## Required Fixes to Run with Docker Compose

The following changes were applied to successfully run `docker compose up`:

### Fix 1: Redis Port in `.env.docker` `[DEF-001]`
**Status**: ✅ FIXED  
**Issue**: `.env.docker.example` sets `METRICS_REDIS_PORT=6380`, but Redis in `docker-compose.yml` runs on `6379`.  
**Fix**: Changed `.env.docker` to `METRICS_REDIS_PORT=6379`.  
**File**: `.env.docker` (line 20)

### Fix 2: PostgreSQL Health Check Path `[DEF-011]`
**Status**: ✅ FIXED  
**Issue**: `docker-compose.yml` health check uses `/opt/homebrew/bin/psql` (macOS Homebrew path on Apple Silicon). This path does not exist in the Linux Docker container, causing the health check to fail and preventing the app service from starting.  
**Fix**: Changed health check from `["CMD", "/opt/homebrew/bin/psql", ...]` to `["CMD-SHELL", "pg_isready -U postgres -d metricsapi"]`. The `pg_isready` utility is included in the Postgres image and works across all platforms.  
**File**: `docker-compose.yml` (lines 54–62)

### Fix 3: Hardcoded Volume Mount `[DEF-009]`
**Status**: ✅ FIXED  
**Issue**: `docker-compose.yml` hardcoded a volume mount to `/Users/alex/data:/app/data` (original author's macOS path), which does not exist on other machines.  
**Fix**: Removed the volume mount entirely. The app does not currently use the `/app/data` directory.  
**File**: `docker-compose.yml` (removed lines 32–33)

### Minimal Setup to Run the Application

After applying the three fixes above, the application runs successfully via Docker Compose:

```bash
docker compose up
```

This single command:
- Builds the Docker image
- Starts PostgreSQL 16 (with migrations automatically applied)
- Starts Redis 7
- Starts the MetricsAPI server on port 3000

**Verification**: The API is available at `http://localhost:3000/health` and responds with `{"status":"ok"}`.

**Note**: Do not run `npm start` locally while Docker Compose is running — both will try to bind port 3000. Either:
- Keep Docker Compose running and access the API via `http://localhost:3000`
- Stop Docker Compose and run local development with `npm run dev` (requires local postgres/redis)

### Test Suite Fixes Applied

#### Fix 1: Unskip MetricValidator Test Suite `[DEF-015]`
**Status**: ✅ FIXED  
**Issue**: `describe.skip('MetricValidator', () => { ... })` prevented all 11 validation tests from running  
**Fix**: Changed to `describe('MetricValidator', () => { ... })` to enable the test suite  
**File**: `tests/unit/MetricValidator.test.ts` (line 13)  
**Result**: All 11 tests now run and pass

#### Fix 2: Correct Jest Matcher in MetricValidator Test
**Status**: ✅ FIXED  
**Issue**: Test used `toContain(expect.stringContaining('name'))` which doesn't work with string arrays  
**Fix**: Changed to `toEqual(expect.arrayContaining([expect.stringContaining('name')]))`  
**File**: `tests/unit/MetricValidator.test.ts` (line 40)  
**Test Output**: 
```
PASS tests/unit/MetricValidator.test.ts
  MetricValidator › validate
    ✓ should accept valid metric input
    ✓ should reject missing name
    ✓ should reject empty name
    ✓ should reject name longer than 255 characters
    ✓ should reject non-numeric value
    ✓ should reject NaN value
    ✓ should reject Infinity value
    ✓ should accept epoch timestamp
    ✓ should reject invalid timestamp string
    ✓ should reject missing value
    ✓ should reject null body

Tests: 11 passed, 11 total
```

---

## Test Suite Analysis

### Overall Coverage
- **Test Suites**: 7 total (6 pass, 1 skip)
  - 6 passing suites: AggregationEngine, CacheManager, MetricController, MetricService, PluginEventBus, metrics.integration
  - 1 skipped suite: MetricValidator
- **Tests**: 48 total (30 pass, 18 skipped, 0 fail)

### Passing Tests (30 total)

| Suite | Test Name | Notes |
|-------|-----------|-------|
| **AggregationEngine** (3 pass) | `should return sum...` | ✅ Correct |
| | `should return 0 for empty...` | ✅ Correct |
| | `should handle single value` | ✅ Correct |
| **CacheManager** (3 pass) | `should return undefined on cache miss` | ✅ Correct |
| | `should store/retrieve from L1` | ✅ Correct |
| | `should return cache stats` | ✅ Correct |
| **MetricController** (4 pass) | `should return 201 on ingest` | ✅ Correct |
| | `should call next on error` | ✅ Correct |
| | `should return 200 on query` | ✅ Correct |
| | `should call next on missing params` | ✅ Correct |
| **MetricService** (3 pass) | `should process through pipeline` | ✅ Correct |
| | `should validate input` | ✅ Correct |
| | `should query with aggregation` | ✅ Correct |
| **PluginEventBus** (5 pass) | `should register handlers` | ✅ Correct |
| | `should emit events` | ✅ Correct |
| | `should remove handlers` | ✅ Correct |
| | `should log events` | ✅ Correct |
| | `should clear handlers/log` | ✅ Correct |
| **Integration** (3 pass) | `should return health status` | ✅ Correct |
| | `should ingest metric` | ⚠️ Uses mock handlers, not real app |
| | `should query with aggregation` | ⚠️ Uses mock handlers, not real app |

### Skipped Tests (18 total)

**MetricValidator.test.ts (0 tests, fully skipped)** `[DEF-015]`
- Entire file wrapped in `describe.skip('MetricValidator', () => { ... })`
- Validation tests never execute
- **Impact**: Zero test coverage for critical input validation layer

**CacheManager.test.ts (4 skipped)** `[DEF-015]`
| Test | Line | Reason |
|------|------|--------|
| `should expire L1 cache after TTL` | 44 | `it.skip()` — TTL behavior untested |
| `should fallthrough to L2 Redis on L1 miss` | 55 | `it.skip()` — L2 fallback untested |
| `should invalidate cache in all tiers` | 63 | `it.skip()` — Invalidation untested |
| `should clear all cached entries` | 73 | `it.skip()` — Clear operation untested |

**metrics.integration.test.ts (3 skipped)** `[DEF-015]`
| Test | Line | Reason |
|------|------|--------|
| `should reject invalid metric data` | 84 | `it.skip()` — Validation edge case untested |
| `should return empty result for unknown metric` | 107 | `it.skip()` — Empty result handling untested |
| `should handle concurrent ingestion` | 123 | `it.skip()` — Concurrency untested |

### Test Defect Catalog

#### TEST-1: AggregationEngine Tests Validate Buggy Percentile `[DEF-002]`
- **File**: `tests/unit/AggregationEngine.test.ts` (lines 59-76)
- **Issue**: Tests assert the Math.ceil-based percentile calculation (off-by-one) as the expected behavior
- **Example**:
  ```typescript
  it('should calculate p50 of sorted array', () => {
    const result = engine.aggregate([1, 2, 3, 4, 5], 'percentile', 50);
    // [DEF-002] Math.ceil(50/100 * 5) - 1 = 3 - 1 = 2
    // sorted[2] = 3
    expect(result.value).toBe(3);  // ← Asserts buggy result as correct
  });
  ```
- **Impact**: Tests pass ✅ but validate incorrect behavior. This is a deliberate trap — all tests green ≠ all behavior correct.

#### TEST-2: MetricValidator Has Zero Test Coverage `[DEF-015]`
- **File**: `tests/unit/MetricValidator.test.ts` (line 13)
- **Issue**: `describe.skip('MetricValidator', () => { ... })` — entire test suite disabled
- **Tests Prevented** (128 lines of tests exist but never run):
  - Valid input acceptance
  - Missing field rejection
  - Empty field rejection
  - Name length validation (max 255 chars)
  - *...and 18+ more validation scenarios*
- **Impact**: Critical validation layer has zero automated coverage. Bugs in validation logic won't be caught by tests.

#### TEST-3: CacheManager Behavior Tests Skipped `[DEF-015]`
- **File**: `tests/unit/CacheManager.test.ts` (lines 44, 55, 63, 73)
- **Tests Skipped**:
  - L1 cache TTL expiry (critical for correctness)
  - L2 Redis fallthrough (core 3-tier cache feature)
  - Cache invalidation (data consistency)
  - Cache clear (cleanup operation)
- **Impact**: The multi-tier cache behavior is untested. Cache correctness cannot be verified.

#### TEST-4: Integration Tests Use Mock Handlers, Not Real App
- **File**: `tests/integration/metrics.integration.test.ts` (lines 25–55)
- **Issue**: Creates a fresh Express app with hardcoded mock route handlers instead of importing the real app
  ```typescript
  // Mock handler: just returns mock data, doesn't test real routes
  mockApp.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  ```
- **Impact**: Tests verify that the test's own mocks work correctly, not that the application works. Full end-to-end integration is not tested.

#### TEST-5: Edge Cases and Concurrency Untested `[DEF-015]`
- **File**: `tests/integration/metrics.integration.test.ts` (lines 84, 107, 123)
- **Tests Skipped**:
  - Invalid metric rejection
  - Empty result handling
  - Concurrent ingestion (race conditions)
- **Impact**: Concurrency issues, race conditions, and validation error paths are untested.

### Test Quality Issues

| Issue | Severity | Files | Impact |
|-------|----------|-------|--------|
| Entire validation suite skipped | 🔴 High | MetricValidator.test.ts | Zero validation coverage |
| Buggy behavior validated as correct | 🟠 Medium | AggregationEngine.test.ts | False confidence in passing tests |
| Cache behavior untested | 🟠 Medium | CacheManager.test.ts | Cache correctness unknown |
| Integration tests mock instead of test | 🟠 Medium | metrics.integration.test.ts | Real integration not verified |
| Edge cases skipped | 🟡 Medium | metrics.integration.test.ts | Edge cases untested |
| No config system tests | 🟡 Medium | — | ConfigProvider/Resolver/Validator untested |
| No storage layer tests | 🟡 Medium | — | PostgresStorageProvider untested |
| No middleware tests | 🟡 Medium | — | errorHandler untested |
| No model binding tests | 🟡 Medium | — | TypeScript models untested |

### Lines of Code Analysis

| Module | File | Lines | Test Coverage |
|--------|------|-------|---|
| MetricValidator | `src/validation/MetricValidator.ts` | ~100 | ❌ 0% (suite skipped) |
| CacheManager | `src/cache/CacheManager.ts` | ~165 | ⚠️ ~40% (tier behavior skipped) |
| ConfigValidator | `src/config/ConfigValidator.ts` | ~269 | ❌ 0% |
| ConfigResolver | `src/config/ConfigResolver.ts` | ~144 | ❌ 0% |
| PostgresStorageProvider | `src/storage/PostgresStorageProvider.ts` | ~120 | ❌ 0% |
| MetricNormalizer | `src/normalization/MetricNormalizer.ts` | ~60 | ❌ 0% |
| MetricEnricher | `src/enrichment/MetricEnricher.ts` | ~70 | ❌ 0% |
| MetricRouter | `src/routing/MetricRouter.ts` | ~60 | ❌ 0% |

### Modules With Zero Test Coverage

| Module | File |
|--------|------|
| MetricNormalizer | [src/normalization/MetricNormalizer.ts](src/normalization/MetricNormalizer.ts) |
| MetricEnricher | [src/enrichment/MetricEnricher.ts](src/enrichment/MetricEnricher.ts) |
| MetricRouter | [src/routing/MetricRouter.ts](src/routing/MetricRouter.ts) |
| StorageAdapter | [src/storage/StorageAdapter.ts](src/storage/StorageAdapter.ts) |
| PostgresStorageProvider | [src/storage/PostgresStorageProvider.ts](src/storage/PostgresStorageProvider.ts) |
| ConfigProvider | [src/config/ConfigProvider.ts](src/config/ConfigProvider.ts) |
| ConfigResolver | [src/config/ConfigResolver.ts](src/config/ConfigResolver.ts) |
| ConfigValidator | [src/config/ConfigValidator.ts](src/config/ConfigValidator.ts) |
| errorHandler | [src/middleware/errorHandler.ts](src/middleware/errorHandler.ts) |
| PluginLifecycleManager | [src/plugins/PluginLifecycleManager.ts](src/plugins/PluginLifecycleManager.ts) |
| PluginRegistry | [src/plugins/PluginRegistry.ts](src/plugins/PluginRegistry.ts) |
| AlertRuleService | [src/services/AlertRuleService.ts](src/services/AlertRuleService.ts) |
| MetricMetadataService | [src/services/MetricMetadataService.ts](src/services/MetricMetadataService.ts) |

---

## Summary Table

| ID | Severity | Description | DEF Label |
|----|----------|-------------|-----------|
| CRIT-1 | 🔴 Critical | Hardcoded password in 3 locations | DEF-010 |
| CRIT-2 | 🔴 Critical | No authentication on any endpoint | — |
| CRIT-3 | 🔴 Critical | Docker container runs as root | — |
| CRIT-4 | 🔴 Critical | Redis exposed with no password | — |
| CRIT-5 | 🔴 Critical | No rate limiting | — |
| HIGH-1 | 🟠 High | Logger inverted — errors suppressed | DEF-013 |
| HIGH-2 | 🟠 High | Percentile off-by-one; p100 rejected | DEF-002 |
| HIGH-3 | 🟠 High | Health check always returns 200 | DEF-003 |
| HIGH-4 | 🟠 High | All errors return HTTP 500 | DEF-012 |
| HIGH-5 | 🟠 High | Config validation errors ignored at startup | — |
| HIGH-6 | 🟠 High | Wrong Redis port in .env.docker.example | DEF-001 |
| MED-1 | 🟡 Medium | Swagger routes don't match real routes | DEF-008 |
| MED-2 | 🟡 Medium | README documents wrong params and types | — |
| MED-3 | 🟡 Medium | Hardcoded volume mount to author's path | DEF-009 |
| MED-4 | 🟡 Medium | macOS-specific psql path in health check | DEF-011 |
| MED-5 | 🟡 Medium | Cache TTLs too short; KEYS blocks Redis | DEF-006 |
| MED-6 | 🟡 Medium | ~460 lines of unused plugin system | DEF-005 |
| MED-7 | 🟡 Medium | Unused services, models, migrations | DEF-014 |
| MED-8 | 🟡 Medium | Over-engineered config for 8 values; fake YAML/TOML | DEF-007 |
| MED-9 | 🟡 Medium | 8-layer pipeline; enricher data never persisted | DEF-004 |
| MED-10 | 🟡 Medium | MetricValidator test suite entirely skipped | DEF-015 |
| LOW-1 | 🟢 Low | MetricService.test.ts tests the controller | DEF-016 |
| LOW-2 | 🟢 Low | Integration tests use mock handlers | — |
| LOW-3 | 🟢 Low | Tests assert buggy percentile as correct | — |
| LOW-4 | 🟢 Low | Additional skipped tests (cache, integration) | DEF-015 |
| LOW-5 | 🟢 Low | Undocumented `median` aggregation type | — |
| LOW-6 | 🟢 Low | Swagger version mismatch (0.9.0 vs 0.1.0) | — |
| LOW-7 | 🟢 Low | lint script is a no-op | — |
| LOW-8 | 🟢 Low | No .dockerignore | — |
| LOW-9 | 🟢 Low | Deprecated `version` key in docker-compose.yml | — |
| TEST-1 | 🟡 Medium | AggregationEngine tests validate buggy percentile | DEF-002 |
| TEST-2 | 🟠 High | MetricValidator has zero test coverage | DEF-015 |
| TEST-3 | 🟡 Medium | Cache behavior tests skipped (4 tests) | DEF-015 |
| TEST-4 | 🟡 Medium | Integration tests use mock handlers, not real app | — |
| TEST-5 | 🟡 Medium | Edge case tests skipped (invalid data, concurrency) | DEF-015 |

---

## Severity Guide

| Severity | Description |
|----------|-------------|
| **🔴 Critical** | Security vulnerabilities, data exposure, exploitable flaws |
| **🟠 High** | Functional bugs that produce wrong results or break core features |
| **🟡 Medium** | Design issues, documentation mismatches, over-engineering |
| **🟢 Low** | Style issues, minor inconsistencies, improvement opportunities |

---

## Detailed Findings

### 🔴 Critical — Security

#### CRIT-1: Hardcoded Password Across Multiple Files `[DEF-010]`
The password `alex_local_dev` is hardcoded in three separate places, making it trivially discoverable.
- [docker-compose.yml](docker-compose.yml) — `METRICS_DB_PASSWORD=alex_local_dev` (line 18) and `POSTGRES_PASSWORD=alex_local_dev` (line 34)
- [src/config/ConfigValidator.ts](src/config/ConfigValidator.ts) — `default: 'alex_local_dev'` baked into the config schema default for `db.password`

**Impact**: Any developer who clones this repo has the database password. In a real deployment, rotating this requires touching multiple files.

---

#### CRIT-2: No Authentication or Authorization on Any Endpoint
Zero authentication middleware exists. All routes (`POST /v1/metrics`, `GET /v1/metrics/query`, `GET /v1/health`) are fully public with no API key, JWT, session, or any other auth mechanism.
- [src/routes/v1.ts](src/routes/v1.ts) — no auth guards
- [src/index.ts](src/index.ts) — no auth middleware registered

**Impact**: Anyone with network access can ingest arbitrary data or query all stored metrics.

---

#### CRIT-3: Docker Container Runs as Root
The [Dockerfile](Dockerfile) has no `USER` directive in the runtime stage, so the Node.js process runs as root inside the container.

**Impact**: A container escape or RCE vulnerability gives an attacker full root access to the host.

---

#### CRIT-4: Redis Exposed with No Password
- [docker-compose.yml](docker-compose.yml) — Redis port 6379 bound to `0.0.0.0` with no `requirepass` set
- The `.env.docker.example` file sets `METRICS_REDIS_PASSWORD` to an empty string

**Impact**: Any process (or attacker) with network access to the host can read, write, or flush the Redis cache.

---

#### CRIT-5: No Rate Limiting
No rate limiting middleware is applied to the ingest (`POST /v1/metrics`) or query (`GET /v1/metrics/query`) endpoints.

**Impact**: The API is completely open to data flooding (ingest spam filling the database) and query abuse (expensive aggregation queries run without restriction).

---

### 🟠 High — Functional Bugs

#### HIGH-1: Logger Severity Inversion — Errors Are Silently Suppressed `[DEF-013]`
[src/utils/logger.ts](src/utils/logger.ts) uses `<=` in `shouldLog()`:
```
LOG_LEVEL_PRIORITY[messageLevel] <= LOG_LEVEL_PRIORITY[this.level]
```
Priority map: `debug:0, info:1, warn:2, error:3`. Default log level is `warn` (priority 2).

With this logic: `error` (3) `<=` `warn` (2) is **false** — so `logger.error()` calls are silently dropped. Every `logger.error()` call in the codebase produces no output at the default log level. Only `debug` (0 <= 2) and `info` (1 <= 2) and `warn` (2 <= 2) pass through.

**The correct operator should be `>=`**.

**Impact**: Runtime errors are invisible. Debugging via logs is completely misleading. This also makes this defect a trap for any analysis that relies on log output.

---

#### HIGH-2: Percentile Calculation Off-by-One `[DEF-002]`
[src/aggregation/AggregationEngine.ts](src/aggregation/AggregationEngine.ts) uses:
```typescript
const index = Math.ceil((percentile / 100) * n) - 1;
```
For `p50` on `[1, 2]` (n=2): `Math.ceil(0.5 * 2) - 1 = Math.ceil(1) - 1 = 0` → returns `1` (index 0), not `1.5` (the correct median).

Additionally, the percentile range is restricted to `1–99`, rejecting `p100` which is a valid percentile (the maximum value).

**Compounding issue**: The test in [tests/unit/AggregationEngine.test.ts](tests/unit/AggregationEngine.test.ts) asserts the *buggy* result as the expected value, so tests pass despite the incorrect behavior.

---

#### HIGH-3: Health Check Always Returns 200 OK `[DEF-003]`
[src/routes/v1.ts](src/routes/v1.ts) — the `/v1/health` endpoint unconditionally returns `{ status: 'ok' }` with HTTP 200, regardless of whether the database pool is connected, Redis is available, or any dependency is healthy.

**Impact**: Container orchestrators (Kubernetes, ECS) rely on health checks for restart decisions. A permanently-green health check means a broken app continues receiving traffic indefinitely.

---

#### HIGH-4: All Errors Return HTTP 500 `[DEF-012]`
[src/middleware/errorHandler.ts](src/middleware/errorHandler.ts) returns `500 "An error occurred"` for every error — validation failures, missing required parameters, not-found conditions, and actual server errors all produce identical responses.

**Impact**: Clients cannot distinguish bad input (4xx) from server failures (5xx). Automated monitoring treats validation errors as server outages. Legitimate clients receive no actionable feedback.

---

#### HIGH-5: Configuration Validation Errors Are Ignored at Startup
[src/index.ts](src/index.ts) calls `configValidator.validateAndApplyDefaults(rawConfig)` but never checks `result.errors`. The app starts even with invalid configuration:
```typescript
const { config } = configValidator.validateAndApplyDefaults(rawConfig);
// result.valid and result.errors are discarded
```
Additionally, environment variables are loaded as strings (e.g., `"5432"` for `db.port`) but the config schema expects numbers. The type mismatch is never caught.

---

#### HIGH-6: Wrong Redis Port in `.env.docker.example` `[DEF-001]`
[`.env.docker.example`](.env.docker.example) sets `METRICS_REDIS_PORT=6380`, but Redis in [docker-compose.yml](docker-compose.yml) is configured on port `6379`. Following the documented setup will cause a Redis connection failure that produces no error log (see HIGH-1).

---

### 🟡 Medium — Design & Documentation Issues

#### MED-1: Swagger Routes Don't Match Actual Routes `[DEF-008]`
[docs/swagger.json](docs/swagger.json) documents:
- `POST /metrics/ingest` → actual route: `POST /v1/metrics`
- `GET /metrics/query` → actual route: `GET /v1/metrics/query`

Swagger has no `/v1/` prefix at all. A developer using the swagger docs to explore the API will get 404s on every request.

Additionally, swagger documents `granularity` and `fill` query parameters that do not exist anywhere in the implementation, and it lists version `0.9.0` while `package.json` declares version `0.1.0`.

---

#### MED-2: README Documents Wrong API Parameters and Types
The README documents these query parameters and aggregation types that do not match the implementation:

| README says | Implementation uses |
|-------------|-------------------|
| `startTime` | `start` |
| `endTime` | `end` |
| `avg` | `average` |
| `p50, p90, p95, p99` | `percentile` (single type, separate `percentileValue` param) |

A user following the README to query the API will receive errors (which will manifest as HTTP 500 per HIGH-4).

---

#### MED-3: Hardcoded Volume Mount to Author's Machine `[DEF-009]`
[docker-compose.yml](docker-compose.yml):
```yaml
volumes:
  - /Users/alex/data:/app/data
```
This path is hardcoded to a specific developer's macOS home directory. `docker-compose up` on any other machine will either fail or silently mount a non-existent path.

---

#### MED-4: macOS-Specific Path in PostgreSQL Health Check `[DEF-011]`
[docker-compose.yml](docker-compose.yml) PostgreSQL health check uses:
```yaml
test: ["CMD", "/opt/homebrew/bin/psql", ...]
```
`/opt/homebrew/bin/psql` is the Homebrew installation path on Apple Silicon Macs. This path does not exist inside a Linux Docker container, on Intel Macs with a different Homebrew path, or on any CI system. The health check will always fail, causing the `app` service (which depends on `db`) to never start.

---

#### MED-5: Cache TTLs Too Short to Be Useful `[DEF-006]`
[src/cache/CacheManager.ts](src/cache/CacheManager.ts):
- L1 in-memory TTL: **1 second**
- L2 Redis TTL: **2 seconds**

With real-world inter-request gaps exceeding 2 seconds, every query misses both cache tiers and hits the database directly. The cache adds serialization overhead (`JSON.stringify`/`parse`) and a Redis network round-trip with a net-negative performance effect. The README's claim of "optimal read performance" is false.

Additionally, `CacheManager.clear()` uses `KEYS metricsapi:cache:*` which is O(N) and **blocks Redis** for the duration. The correct approach is `SCAN`.

---

#### MED-6: Unused Plugin System (~460 Lines of Dead Code) `[DEF-005]`
Three plugin infrastructure files total ~460 lines:
- [src/plugins/PluginEventBus.ts](src/plugins/PluginEventBus.ts)
- [src/plugins/PluginRegistry.ts](src/plugins/PluginRegistry.ts)
- [src/plugins/PluginLifecycleManager.ts](src/plugins/PluginLifecycleManager.ts)

Zero plugins are ever registered. [src/index.ts](src/index.ts) fires `request:start` and `request:end` events on every HTTP request to zero listeners, adding overhead with no benefit.

---

#### MED-7: Unused Services, Models, and Migrations `[DEF-014]`
Complete implementations exist for features that are never wired into any route:
- [src/services/MetricMetadataService.ts](src/services/MetricMetadataService.ts) — full CRUD, never called
- [src/services/AlertRuleService.ts](src/services/AlertRuleService.ts) — full CRUD, never called
- [src/models/MetricMetadata.ts](src/models/MetricMetadata.ts) — unused model
- [src/models/AlertRule.ts](src/models/AlertRule.ts) — unused model
- [migrations/002_create_metric_metadata.sql](migrations/002_create_metric_metadata.sql) — table created, never queried
- [migrations/003_create_alert_rules.sql](migrations/003_create_alert_rules.sql) — table created, never queried

---

#### MED-8: Over-Engineered Config System for 8 Values `[DEF-007]`
Three config files (~400 lines) manage exactly 8 configuration values. The `ConfigProvider` claims to support YAML, TOML, and JSON formats, but:
- Neither a YAML nor TOML parser package is in [package.json](package.json) — the fallback parsers are simplified regex implementations that only handle flat `key: value` strings
- The application only ever calls `loadEnv()` at startup — the other formats are dead code

---

#### MED-9: Over-Engineered 8-Layer Ingestion Pipeline `[DEF-004]`
A single metric insert passes through 8 layers:
> `MetricController` → `MetricService` → `MetricValidator` → `MetricNormalizer` → `MetricEnricher` → `MetricRouter` → `StorageAdapter` → `PostgresStorageProvider`

Each layer wraps errors in its own custom error type. The `MetricEnricher` computes source, environment, and metadata fields that are **never persisted** — only `metric_name`, `value`, and `timestamp` reach the database.

`MetricRouter` is a routing abstraction that always selects `'postgres'`; the `timescaledb` and `influxdb` branches fall through to Postgres anyway.

---

#### MED-10: `MetricValidator.test.ts` Entire Suite Is Skipped `[DEF-015]`
```typescript
describe.skip('MetricValidator', () => {
```
The entire validation test file is disabled. `MetricValidator` has zero test coverage despite being a critical correctness gate for the ingestion pipeline.

---

### 🟢 Low — Minor Issues

#### LOW-1: `MetricService.test.ts` Tests `MetricController` `[DEF-016]`
[tests/unit/MetricService.test.ts](tests/unit/MetricService.test.ts) imports `MetricController` and tests controller behavior. It does not test `MetricService` at all. The service's pipeline orchestration, cache interaction, and error wrapping have zero test coverage. The file name is a lie.

---

#### LOW-2: Integration Tests Use Mock Handlers, Not the Real App
[tests/integration/metrics.integration.test.ts](tests/integration/metrics.integration.test.ts) creates a fresh Express app with hardcoded mock route handlers instead of booting the real application. These tests verify that the test's own mocks work correctly, not that the application works correctly.

---

#### LOW-3: AggregationEngine Tests Validate Buggy Behavior
[tests/unit/AggregationEngine.test.ts](tests/unit/AggregationEngine.test.ts) asserts the off-by-one percentile result (from HIGH-2) as the expected value. Tests pass, but they are asserting incorrect behavior. This is a deliberate trap — all tests green does not mean all behavior correct.

---

#### LOW-4: Additional Tests Skipped `[DEF-015]`
Beyond the fully-skipped MetricValidator suite:
- [tests/unit/CacheManager.test.ts](tests/unit/CacheManager.test.ts) — 4 of 6 tests are `it.skip` (TTL expiry, L2 fallthrough, invalidation, clear)
- [tests/integration/metrics.integration.test.ts](tests/integration/metrics.integration.test.ts) — 3 of 6 tests are `it.skip` (invalid input rejection, empty result, concurrent ingestion)

---

#### LOW-5: Undocumented `median` Aggregation Type
[src/aggregation/AggregationEngine.ts](src/aggregation/AggregationEngine.ts) implements a `median` aggregation type that does not appear in the README, swagger docs, or the MetricValidator's allowed type enum. It is callable at runtime but undiscoverable via any documentation. Confirmed via debug log output during `npm test`: `Computing median over 3 values`.

---

#### LOW-6: Swagger Version Mismatch
- [docs/swagger.json](docs/swagger.json): version `0.9.0`
- [package.json](package.json): version `0.1.0`

---

#### LOW-7: `lint` Script Is a No-Op
[package.json](package.json): `"lint": "echo 'No linter configured'"` — running `npm run lint` prints a message and exits 0. No linting is performed.

---

#### LOW-8: No `.dockerignore`
The repo has no `.dockerignore` file. The Docker build context includes `node_modules`, `tests`, `docs`, `.git`, and all other dev files, unnecessarily bloating the build and potentially leaking local development artifacts into the image.

---

#### LOW-9: Deprecated `version` Key in docker-compose.yml
[docker-compose.yml](docker-compose.yml): `version: '3.8'` is deprecated in Docker Compose v2+. Modern Compose ignores this key but emits a warning.

---

## Confirmed Runtime Behavior (Docker Compose)

**Ingest Endpoint (`POST /v1/metrics`)**
- Request: Valid metric data matching the README example
- Expected: Success with 201 response containing the persisted record
- **Actual**: Returns `{ error: "An error occurred" }` (HTTP 500)
- **However**: Docker logs show the metric was successfully validated, normalized, enriched, and stored in PostgreSQL with a valid UUID
- **Discrepancy**: The operation completes successfully in the application pipeline but a 500 error is returned to the client

**Query Endpoint (`GET /v1/metrics/query`)**
- Request: `?name=cpu_usage&start=2025-12-01T00:00:00Z&end=2025-12-02T00:00:00Z&aggregation=sum`
- Expected: Query results with aggregated data
- **Actual**: Returns `{ error: "An error occurred" }` (HTTP 500)
- **However**: Docker logs show the query was processed successfully:
  - Cache lookup performed
  - Database query executed
  - Data retrieved from `metric_data_points` table
- **Discrepancy**: The operation completes successfully in the application pipeline but a 500 error is returned to the client

**Health Endpoint (`GET /health`)**
- ✅ Returns `{ status: "ok" }` with HTTP 200 as documented
- Works correctly despite Redis connection failures

### Runtime Issues Identified

**RUNTIME-1: Ingest Returns Error Despite Successful Persistence**
Operations complete successfully and persist data, but the error middleware is returning 500 responses to clients. The error is being thrown somewhere in the response handling, not in the ingestion pipeline itself. Requires debugging to identify where in the response chain the exception occurs.

**RUNTIME-2: Query Returns Error Despite Successful Execution**
Similar to RUNTIME-1 — the query pipeline executes end-to-end successfully (seen in logs) but the response handler throws an error. The aggregation or response formatting may be failing.

**RUNTIME-3: Redis Connection Failures**
Despite configuring `METRICS_REDIS_HOST=redis` in `.env.docker`, the app is attempting to connect to `127.0.0.1:6379` instead of the Docker service `redis:6379`. This suggests:
- Environment variables are not being loaded into the appConfig correctly, OR
- The config system is applying hardcoded defaults over environment values, OR
- A networking issue in Docker preventing inter-container communication

The app continues to work (writes to Postgres, queries execute) because Redis connection failures are non-fatal—caching is disabled and queries fall through to the database.

### Expected Outcomes (Pre-Runtime Analysis vs. Actual)
- `GET /v1/health` will return `200 { status: 'ok' }` regardless of DB/Redis state (HIGH-3) — ✅ **Confirmed**
- `GET /v1/metrics/query?startTime=...` (README params) will return `500 An error occurred` (HIGH-4, MED-2) — ✅ **Confirmed** (but for wrong reason — endpoints themselves work)
- `POST /v1/metrics` with valid body should succeed; enricher metadata will be silently discarded (MED-9) — ⚠️ **Partially confirmed** (data is persisted but returns 500)
- No `logger.error()` output will appear at the default log level (HIGH-1) — ✅ **Confirmed**
- `docker-compose up` successfully starts all services — ✅ **Confirmed** (fixes applied)
