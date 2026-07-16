from app.modules.auth.router import router as auth_router
from app.modules.ingest.router import router as ingest_router
from app.modules.metrics.router import router as metrics_router
from app.modules.network.router import router as network_router
from app.modules.segments.router import router as segments_router

__all__ = [
    "auth_router",
    "segments_router",
    "network_router",
    "metrics_router",
    "ingest_router",
]
