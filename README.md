# MetricsAPI

A lightweight (but extensible!) metrics ingestion microservice for accepting time-series data points over REST and querying them back with aggregation. Think of it as a baby Datadog — built to be production-ready from day one with a clean, layered architecture.

## Architecture

The ingestion pipeline follows a clean separation of concerns:

```
MetricController → MetricService → MetricValidator → MetricNormalizer
  → MetricEnricher → MetricRouter → StorageAdapter → PostgresStorageProvider
```

Each layer has a single responsibility and its own error handling. This makes it extremely easy to swap out any individual component without touching the rest of the stack. For example, if you wanted to switch from Postgres to Cassandra, you'd only need to implement a new `StorageProvider` — everything upstream stays the same.

The service also includes a **plugin system** (`PluginRegistry`, `PluginLifecycleManager`, `PluginEventBus`) that fires lifecycle events on every request. No plugins are registered yet, but the infrastructure is there for when we need it. This was a deliberate architectural investment to avoid a costly refactor later.

### Caching

We use a **three-tier caching strategy** via `CacheManager`:

- **L1**: In-memory cache (fastest)
- **L2**: Redis
- **L3**: Database (fallback)

This ensures optimal read performance across different access patterns. TTLs are configured conservatively to prioritize consistency.

### Configuration

Config is loaded through a flexible chain (`ConfigProvider` → `ConfigResolver` → `ConfigValidator`) that supports YAML, JSON, TOML, and environment variables with dot-notation overrides. This gives us maximum flexibility for different deployment environments.

## Tech Stack

- Node.js (≥20) / TypeScript
- Express
- PostgreSQL 16
- Redis
- Docker Compose

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js ≥ 20 (for local dev)

### Running with Docker

```bash
docker compose up
```

The service will be available at `http://localhost:3000`.

> **Note:** You may need to create an `.env.docker` file — see `.env.docker.example` for reference.

### Running Locally

```bash
npm install
npm run build
npm start
```

Or for development with hot reload:

```bash
npm run dev
```

## API

### Ingest a Metric

```
POST /v1/metrics
Content-Type: application/json

{
  "name": "cpu_usage",
  "value": 72.5,
  "tags": { "host": "web-01", "region": "us-east-1" },
  "timestamp": "2025-12-01T00:00:00Z"
}
```

### Query Metrics

```
GET /v1/metrics/query?name=cpu_usage&startTime=2025-12-01T00:00:00Z&endTime=2025-12-02T00:00:00Z&aggregation=avg
```

Supported aggregations: `sum`, `avg`, `p50`, `p90`, `p95`, `p99`

### Health Check

```
GET /health
```

Returns `200 OK` with `{ "status": "ok" }`.

### API Docs

Swagger UI is available at `/api-docs` when the server is running.

## Database

Migrations are in the `migrations/` directory and are applied automatically when Postgres starts via Docker. Tables:

- `metric_data_points` — Core time-series data
- `metric_metadata` — Metadata for metric definitions (planned feature)
- `alert_rules` — Alerting rule definitions (planned feature)

## Testing

```bash
npm test
```

Tests are in the `tests/` directory, organized into `unit/` and `integration/` suites. Some tests are skipped pending implementation of downstream features.

## Project Structure

```
src/
├── aggregation/       # Aggregation engine (sum, avg, percentiles)
├── cache/             # Three-tier cache manager
├── config/            # Config loading & validation chain
├── controllers/       # Express request handlers
├── enrichment/        # Metric enrichment (adds computed fields)
├── middleware/        # Error handler, etc.
├── models/            # TypeScript models
├── normalization/     # Metric name/tag normalization
├── plugins/           # Plugin system (registry, lifecycle, event bus)
├── routes/            # Express route definitions
├── routing/           # Custom metric routing layer
├── services/          # Business logic services
├── storage/           # Storage adapter + Postgres provider
├── utils/             # Logger
└── validation/        # Input validation
```

## Future Work

- Plugin implementations (the system is ready, we just need actual plugins)
- Metric metadata and alert rules (tables and services are already wired up)
- Granularity and fill options on the query endpoint
- Dashboard UI

## License

Internal use only.
