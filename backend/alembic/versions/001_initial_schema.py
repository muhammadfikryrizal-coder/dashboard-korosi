"""Initial schema for PipelineGuard modular monolith.

Revision ID: 001_initial
Revises:
Create Date: 2026-07-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("initial", sa.String(length=8), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "segments",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("node_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("area", sa.String(length=64), nullable=False),
        sa.Column("predicted_class", sa.String(length=32), nullable=False),
        sa.Column("actual_class", sa.String(length=32), nullable=False),
        sa.Column("prediction_correct", sa.Boolean(), nullable=False),
        sa.Column("safe_prob", sa.Float(), nullable=False),
        sa.Column("warning_prob", sa.Float(), nullable=False),
        sa.Column("critical_prob", sa.Float(), nullable=False),
        sa.Column("priority_tier", sa.String(length=8), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=False),
        sa.Column("propagation_uplift", sa.Float(), nullable=False),
        sa.Column("temp_avg", sa.Float(), nullable=False),
        sa.Column("press_avg", sa.Float(), nullable=False),
        sa.Column("ph_level", sa.Float(), nullable=False),
        sa.Column("pco2_psi", sa.Float(), nullable=False),
        sa.Column("h2s_ppm", sa.Float(), nullable=False),
        sa.Column("chloride_ppm", sa.Float(), nullable=False),
        sa.Column("inhibitor_ppm", sa.Float(), nullable=False),
        sa.Column("segment_age", sa.Float(), nullable=False),
        sa.Column("wall_thick_nom", sa.Float(), nullable=False),
        sa.Column("corrosion_rate_mm_yr", sa.Float(), nullable=False),
        sa.Column("thickness_loss_pct", sa.Float(), nullable=False),
        sa.Column("nlp_anomaly_score", sa.Float(), nullable=False),
        sa.Column("inspection_note", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.Text(), nullable=False),
        sa.Column("target_sla", sa.String(length=64), nullable=False),
    )
    op.create_index("ix_segments_node_id", "segments", ["node_id"])
    op.create_index("ix_segments_area", "segments", ["area"])
    op.create_index("ix_segments_predicted_class", "segments", ["predicted_class"])
    op.create_index("ix_segments_priority_tier", "segments", ["priority_tier"])

    op.create_table(
        "edges",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source", sa.Integer(), nullable=False),
        sa.Column("target", sa.Integer(), nullable=False),
        sa.Column("flow_vol", sa.Float(), nullable=False),
        sa.Column("distance", sa.Float(), nullable=False),
        sa.Column("elevation_delta", sa.Float(), nullable=False),
        sa.UniqueConstraint("source", "target", name="uq_edge_source_target"),
    )
    op.create_index("ix_edges_source", "edges", ["source"])
    op.create_index("ix_edges_target", "edges", ["target"])

    op.create_table(
        "model_metrics",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("architecture", sa.String(length=128), nullable=False),
        sa.Column("physics_model", sa.Text(), nullable=False),
        sa.Column("classes_json", sa.JSON(), nullable=False),
        sa.Column("best_test_f1", sa.Float(), nullable=False),
        sa.Column("test_accuracy", sa.Float(), nullable=False),
        sa.Column("inference_mode", sa.String(length=64), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "shap_features",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("feature", sa.String(length=128), nullable=False, unique=True),
        sa.Column("importance", sa.Float(), nullable=False),
    )

    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("scenario", sa.String(length=255), nullable=False, unique=True),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("macro_f1", sa.Float(), nullable=False),
        sa.Column("critical_f1", sa.Float(), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
    )

    op.create_table(
        "stress_summary",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("std_critical_rate", sa.Float(), nullable=False),
        sa.Column("stress_critical_rate", sa.Float(), nullable=False),
        sa.Column("std_avg_critical_prob", sa.Float(), nullable=False),
        sa.Column("stress_avg_critical_prob", sa.Float(), nullable=False),
        sa.Column("std_avg_priority_score", sa.Float(), nullable=False),
    )

    op.create_table(
        "multi_seed",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("critical_prob_mean_mean", sa.Float(), nullable=False),
        sa.Column("critical_prob_mean_std", sa.Float(), nullable=False),
        sa.Column("critical_rate_mean", sa.Float(), nullable=False),
        sa.Column("critical_rate_std", sa.Float(), nullable=False),
        sa.Column("samples_json", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("multi_seed")
    op.drop_table("stress_summary")
    op.drop_table("scenarios")
    op.drop_table("shap_features")
    op.drop_table("model_metrics")
    op.drop_index("ix_edges_target", table_name="edges")
    op.drop_index("ix_edges_source", table_name="edges")
    op.drop_table("edges")
    op.drop_index("ix_segments_priority_tier", table_name="segments")
    op.drop_index("ix_segments_predicted_class", table_name="segments")
    op.drop_index("ix_segments_area", table_name="segments")
    op.drop_index("ix_segments_node_id", table_name="segments")
    op.drop_table("segments")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
