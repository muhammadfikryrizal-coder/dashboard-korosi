from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.modules.ingest.schemas import IngestRequest, IngestResponse
from app.modules.ingest.service import ingest_from_artifacts

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/from-artifacts", response_model=IngestResponse)
def ingest_artifacts(
    body: IngestRequest,
    db: DbSession,
    _user: CurrentUser,
) -> IngestResponse:
    try:
        counts = ingest_from_artifacts(db, rebuild=body.rebuild)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — surface ingest failures to client
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingest failed: {exc}",
        ) from exc
    return IngestResponse(counts=counts)
