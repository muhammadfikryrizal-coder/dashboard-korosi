from sqlalchemy.orm import Session

from app.db.models import Segment


def list_segments(
    db: Session,
    *,
    area: str | None = None,
    priority_tier: str | None = None,
    predicted_class: str | None = None,
) -> list[Segment]:
    q = db.query(Segment)
    if area:
        q = q.filter(Segment.area == area)
    if priority_tier:
        q = q.filter(Segment.priority_tier == priority_tier)
    if predicted_class:
        q = q.filter(Segment.predicted_class == predicted_class)
    return q.order_by(Segment.priority_score.desc()).all()


def get_segment(db: Session, segment_id: str) -> Segment | None:
    return db.query(Segment).filter(Segment.id == segment_id).first()
