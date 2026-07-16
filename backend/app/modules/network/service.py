from sqlalchemy.orm import Session

from app.db.models import Edge


def list_edges(db: Session) -> list[Edge]:
    return db.query(Edge).order_by(Edge.id.asc()).all()
