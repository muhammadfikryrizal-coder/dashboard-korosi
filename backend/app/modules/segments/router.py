from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.modules.segments.schemas import SegmentListOut, SegmentOut
from app.modules.segments.service import get_segment, list_segments

router = APIRouter(prefix="/segments", tags=["segments"])


@router.get("", response_model=SegmentListOut, response_model_by_alias=True)
def get_segments(
    db: DbSession,
    _user: CurrentUser,
    area: str | None = Query(default=None),
    priority_tier: str | None = Query(default=None, alias="priorityTier"),
    predicted_class: str | None = Query(default=None, alias="predictedClass"),
) -> SegmentListOut:
    items = list_segments(
        db,
        area=area,
        priority_tier=priority_tier,
        predicted_class=predicted_class,
    )
    return SegmentListOut(
        items=[SegmentOut.model_validate(s) for s in items],
        total=len(items),
    )


@router.get("/{segment_id}", response_model=SegmentOut, response_model_by_alias=True)
def get_segment_by_id(
    segment_id: str,
    db: DbSession,
    _user: CurrentUser,
) -> SegmentOut:
    segment = get_segment(db, segment_id)
    if segment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Segment not found")
    return SegmentOut.model_validate(segment)
