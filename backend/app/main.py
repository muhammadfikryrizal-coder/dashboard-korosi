from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.modules import (
    auth_router,
    ingest_router,
    metrics_router,
    network_router,
    segments_router,
)
from app.modules.ingest.service import ingest_from_artifacts


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Idempotent bootstrap so /docs is usable after first start.
        ingest_from_artifacts(db, rebuild=False)
    except Exception:
        # Empty DB is fine; operator can POST /ingest/from-artifacts later.
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_v1_prefix
app.include_router(auth_router, prefix=prefix)
app.include_router(segments_router, prefix=prefix)
app.include_router(network_router, prefix=prefix)
app.include_router(metrics_router, prefix=prefix)
app.include_router(ingest_router, prefix=prefix)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
