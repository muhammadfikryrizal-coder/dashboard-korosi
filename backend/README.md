# PipelineGuard AI — Backend

Modular monolith API (FastAPI + SQLAlchemy) for corrosion dashboard data.

## Quick start

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or: cp .env.example .env

python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

Open API docs: http://127.0.0.1:8000/docs

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `sqlite:///./pipelineguard.db` | Use `postgresql+psycopg2://user:pass@localhost:5432/pipelineguard` for Postgres |
| `JWT_SECRET` | `change-me-in-production` | Required for real deployments |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated |
| `DEMO_USERNAME` / `DEMO_PASSWORD` | `admin` / `pipeline2026` | Seeded operator |

## Migrations (Alembic)

```bash
alembic upgrade head
```

Local scaffold also calls `Base.metadata.create_all` on startup.

## Seed / ingest

```bash
python scripts/seed.py
python scripts/seed.py --rebuild   # runs ../scripts/build_data.py first
```

Authenticated: `POST /api/v1/ingest/from-artifacts` with body `{"rebuild": false}`.

## Auth

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"pipeline2026\"}"
```

Use `Authorization: Bearer <token>` on other `/api/v1/*` routes.

## Architecture

See [docs/architecture/ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md).
