from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import ModelMetrics, MultiSeed, Scenario, ShapFeature, StressSummary


def get_model_metrics(db: Session) -> ModelMetrics:
    row = db.query(ModelMetrics).order_by(ModelMetrics.id.desc()).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No model metrics")
    return row


def list_shap(db: Session) -> list[ShapFeature]:
    return db.query(ShapFeature).order_by(ShapFeature.importance.desc()).all()


def list_scenarios(db: Session) -> list[Scenario]:
    return db.query(Scenario).order_by(Scenario.id.asc()).all()


def get_stress(db: Session) -> StressSummary:
    row = db.query(StressSummary).order_by(StressSummary.id.desc()).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No stress summary")
    return row


def get_multi_seed(db: Session) -> MultiSeed:
    row = db.query(MultiSeed).order_by(MultiSeed.id.desc()).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No multi-seed data")
    return row
