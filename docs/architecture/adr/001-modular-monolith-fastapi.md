# ADR 001: Modular monolith with FastAPI

## Status

Accepted

## Context

PipelineGuard AI is a small-team corrosion dashboard. Today it is a React SPA with offline ML-derived JSON. We need a real backend without operational complexity of microservices.

Per `senior-architect` pattern selection:

- Team size 1–3 → start with modular monolith
- Domain boundaries are clear (auth, segments, network, metrics, ingest)
- Shared database is acceptable
- Rapid iteration is priority

Python already owns the GraphSAGE artifact pipeline (`scripts/build_data.py`). Express is present in `package.json` but unused.

## Decision

Adopt a **modular monolith** implemented with **FastAPI**, one deployable unit under `backend/`, with modules under `app/modules/*`.

## Consequences

**Pros**

- Single process, simple deploy (`uvicorn`)
- Clear module folders ready for future extraction
- Same language as ML ingest pipeline
- OpenAPI docs for free

**Cons**

- Must enforce module boundaries by convention
- Scaling remains all-or-nothing until modules are extracted

## Alternatives considered

| Option | Why not |
|--------|---------|
| Microservices | Overkill for team size and unclear ops budget |
| Express-only Node API | Weaker fit for existing Python ML artifacts |
| Keep static JSON forever | Blocks real auth, multi-user, and live ingest |
