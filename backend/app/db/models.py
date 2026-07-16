from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(64), default="Operator")
    initial: Mapped[str] = mapped_column(String(8), default="A")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    node_id: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    area: Mapped[str] = mapped_column(String(64), index=True)
    predicted_class: Mapped[str] = mapped_column(String(32), index=True)
    actual_class: Mapped[str] = mapped_column(String(32))
    prediction_correct: Mapped[bool] = mapped_column(Boolean, default=True)
    safe_prob: Mapped[float] = mapped_column(Float)
    warning_prob: Mapped[float] = mapped_column(Float)
    critical_prob: Mapped[float] = mapped_column(Float)
    priority_tier: Mapped[str] = mapped_column(String(8), index=True)
    priority_score: Mapped[float] = mapped_column(Float)
    propagation_uplift: Mapped[float] = mapped_column(Float)
    temp_avg: Mapped[float] = mapped_column(Float)
    press_avg: Mapped[float] = mapped_column(Float)
    ph_level: Mapped[float] = mapped_column(Float)
    pco2_psi: Mapped[float] = mapped_column(Float)
    h2s_ppm: Mapped[float] = mapped_column(Float)
    chloride_ppm: Mapped[float] = mapped_column(Float)
    inhibitor_ppm: Mapped[float] = mapped_column(Float)
    segment_age: Mapped[float] = mapped_column(Float)
    wall_thick_nom: Mapped[float] = mapped_column(Float)
    corrosion_rate_mm_yr: Mapped[float] = mapped_column(Float)
    thickness_loss_pct: Mapped[float] = mapped_column(Float)
    nlp_anomaly_score: Mapped[float] = mapped_column(Float)
    inspection_note: Mapped[str] = mapped_column(Text, default="")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    target_sla: Mapped[str] = mapped_column(String(64), default="")


class Edge(Base):
    __tablename__ = "edges"
    __table_args__ = (UniqueConstraint("source", "target", name="uq_edge_source_target"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[int] = mapped_column(Integer, index=True)
    target: Mapped[int] = mapped_column(Integer, index=True)
    flow_vol: Mapped[float] = mapped_column(Float)
    distance: Mapped[float] = mapped_column(Float)
    elevation_delta: Mapped[float] = mapped_column(Float)


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(128))
    version: Mapped[str] = mapped_column(String(32))
    architecture: Mapped[str] = mapped_column(String(128))
    physics_model: Mapped[str] = mapped_column(Text)
    classes_json: Mapped[list] = mapped_column(JSON)
    best_test_f1: Mapped[float] = mapped_column(Float)
    test_accuracy: Mapped[float] = mapped_column(Float)
    inference_mode: Mapped[str] = mapped_column(String(64))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ShapFeature(Base):
    __tablename__ = "shap_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    feature: Mapped[str] = mapped_column(String(128), unique=True)
    importance: Mapped[float] = mapped_column(Float)


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scenario: Mapped[str] = mapped_column(String(255), unique=True)
    accuracy: Mapped[float] = mapped_column(Float)
    macro_f1: Mapped[float] = mapped_column(Float)
    critical_f1: Mapped[float] = mapped_column(Float)
    purpose: Mapped[str] = mapped_column(Text, default="")


class StressSummary(Base):
    __tablename__ = "stress_summary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    std_critical_rate: Mapped[float] = mapped_column(Float)
    stress_critical_rate: Mapped[float] = mapped_column(Float)
    std_avg_critical_prob: Mapped[float] = mapped_column(Float)
    stress_avg_critical_prob: Mapped[float] = mapped_column(Float)
    std_avg_priority_score: Mapped[float] = mapped_column(Float)


class MultiSeed(Base):
    __tablename__ = "multi_seed"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    critical_prob_mean_mean: Mapped[float] = mapped_column(Float)
    critical_prob_mean_std: Mapped[float] = mapped_column(Float)
    critical_rate_mean: Mapped[float] = mapped_column(Float)
    critical_rate_std: Mapped[float] = mapped_column(Float)
    samples_json: Mapped[list] = mapped_column(JSON)
