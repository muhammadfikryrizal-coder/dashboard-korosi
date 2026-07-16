from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.network.schemas import EdgeListOut, EdgeOut
from app.modules.network.service import list_edges

router = APIRouter(prefix="/network", tags=["network"])


@router.get("/edges", response_model=EdgeListOut, response_model_by_alias=True)
def get_edges(db: DbSession, _user: CurrentUser) -> EdgeListOut:
    items = list_edges(db)
    return EdgeListOut(
        items=[EdgeOut.model_validate(e) for e in items],
        total=len(items),
    )
