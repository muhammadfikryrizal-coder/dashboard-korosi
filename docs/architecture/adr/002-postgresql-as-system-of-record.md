# ADR 002: PostgreSQL as system of record

## Status

Accepted

## Context

Dashboard data is relational: segments (nodes), edges (graph), model metrics, and validation payloads. Operators need filters by area, priority tier, and predicted class. Strong consistency for seed/ingest upserts is desirable.

Per `senior-architect` database workflow: structured relationships + ACID → SQL; default choice → PostgreSQL.

## Decision

Use **PostgreSQL** as the primary database via SQLAlchemy 2.x + Alembic.

For local scaffolding without Postgres installed, `DATABASE_URL` may point at **SQLite** (`sqlite:///./pipelineguard.db`). Production target remains PostgreSQL.

## Consequences

**Pros**

- Fits segment↔edge joins and filtering
- JSON columns available for flexible validation blobs if needed
- Standard ops tooling and backups

**Cons**

- Requires a running Postgres (or Docker) for prod-like local work
- Schema migrations add process overhead vs JSON files

## Alternatives considered

| Option | Why not |
|--------|---------|
| MongoDB | Relationships and filters are relational; no strong need for flexible docs |
| Files only (`realData.json`) | Not multi-client safe; no auth users table |
| DynamoDB | Unnecessary AWS lock-in for this stage |
