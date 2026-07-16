from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import (
    Edge,
    ModelMetrics,
    MultiSeed,
    Scenario,
    Segment,
    ShapFeature,
    StressSummary,
    User,
)

REPO_ROOT = Path(__file__).resolve().parents[4]
REAL_DATA_PATH = REPO_ROOT / "src" / "lib" / "realData.json"
BUILD_DATA_SCRIPT = REPO_ROOT / "scripts" / "build_data.py"


def ensure_demo_user(db: Session) -> None:
    user = db.query(User).filter(User.username == settings.demo_username).first()
    password_hash = hash_password(settings.demo_password)
    initial = (settings.demo_display_name[:1] or "A").upper()
    if user is None:
        db.add(
            User(
                username=settings.demo_username,
                password_hash=password_hash,
                display_name=settings.demo_display_name,
                role=settings.demo_role,
                initial=initial,
                is_active=True,
            )
        )
    else:
        user.password_hash = password_hash
        user.display_name = settings.demo_display_name
        user.role = settings.demo_role
        user.initial = initial
        user.is_active = True


def _segment_from_payload(row: dict) -> Segment:
    return Segment(
        id=str(row["id"]),
        node_id=int(row["nodeId"]),
        name=row["name"],
        area=row["area"],
        predicted_class=row["predictedClass"],
        actual_class=row["actualClass"],
        prediction_correct=bool(row["predictionCorrect"]),
        safe_prob=float(row["safeProb"]),
        warning_prob=float(row["warningProb"]),
        critical_prob=float(row["criticalProb"]),
        priority_tier=row["priorityTier"],
        priority_score=float(row["priorityScore"]),
        propagation_uplift=float(row["propagationUplift"]),
        temp_avg=float(row["tempAvg"]),
        press_avg=float(row["pressAvg"]),
        ph_level=float(row["phLevel"]),
        pco2_psi=float(row["pco2Psi"]),
        h2s_ppm=float(row["h2sPpm"]),
        chloride_ppm=float(row["chloridePpm"]),
        inhibitor_ppm=float(row["inhibitorPpm"]),
        segment_age=float(row["segmentAge"]),
        wall_thick_nom=float(row["wallThickNom"]),
        corrosion_rate_mm_yr=float(row["corrosionRateMmYr"]),
        thickness_loss_pct=float(row["thicknessLossPct"]),
        nlp_anomaly_score=float(row["nlpAnomalyScore"]),
        inspection_note=row.get("inspectionNote") or "",
        recommended_action=row.get("recommendedAction") or "",
        target_sla=row.get("targetSla") or "",
    )


def load_real_data(path: Path | None = None) -> dict:
    data_path = path or REAL_DATA_PATH
    if not data_path.exists():
        raise FileNotFoundError(f"realData.json not found at {data_path}")
    with data_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def maybe_rebuild_from_artifacts(*, rebuild: bool) -> None:
    if not rebuild:
        return
    if not BUILD_DATA_SCRIPT.exists():
        raise FileNotFoundError(f"build_data.py not found at {BUILD_DATA_SCRIPT}")
    subprocess.run([sys.executable, str(BUILD_DATA_SCRIPT)], check=True, cwd=str(REPO_ROOT))


def ingest_payload(db: Session, payload: dict) -> dict[str, int]:
    """Replace operational datasets with payload contents (upsert-style refresh)."""
    db.query(Segment).delete()
    db.query(Edge).delete()
    db.query(ShapFeature).delete()
    db.query(Scenario).delete()
    db.query(ModelMetrics).delete()
    db.query(StressSummary).delete()
    db.query(MultiSeed).delete()

    segments = [_segment_from_payload(row) for row in payload.get("segments", [])]
    db.add_all(segments)

    edges = [
        Edge(
            source=int(e["source"]),
            target=int(e["target"]),
            flow_vol=float(e["flowVol"]),
            distance=float(e["distance"]),
            elevation_delta=float(e["elevationDelta"]),
        )
        for e in payload.get("edges", [])
    ]
    db.add_all(edges)

    mm = payload.get("modelMetrics") or {}
    if mm:
        db.add(
            ModelMetrics(
                model_name=mm.get("modelName", ""),
                version=mm.get("version", ""),
                architecture=mm.get("architecture", ""),
                physics_model=mm.get("physicsModel", ""),
                classes_json=mm.get("classes") or [],
                best_test_f1=float(mm.get("bestTestF1") or 0),
                test_accuracy=float(mm.get("testAccuracy") or 0),
                inference_mode=mm.get("inferenceMode", ""),
            )
        )

    shap_rows = [
        ShapFeature(feature=s["feature"], importance=float(s["importance"]))
        for s in payload.get("shapImportance", [])
    ]
    db.add_all(shap_rows)

    scenarios = [
        Scenario(
            scenario=s["scenario"],
            accuracy=float(s["accuracy"]),
            macro_f1=float(s["macroF1"]),
            critical_f1=float(s["criticalF1"]),
            purpose=s.get("purpose") or "",
        )
        for s in payload.get("scenarios", [])
    ]
    db.add_all(scenarios)

    stress = payload.get("stressSummary") or {}
    if stress:
        db.add(
            StressSummary(
                std_critical_rate=float(stress.get("stdCriticalRate") or 0),
                stress_critical_rate=float(stress.get("stressCriticalRate") or 0),
                std_avg_critical_prob=float(stress.get("stdAvgCriticalProb") or 0),
                stress_avg_critical_prob=float(stress.get("stressAvgCriticalProb") or 0),
                std_avg_priority_score=float(stress.get("stdAvgPriorityScore") or 0),
            )
        )

    multi = payload.get("multiSeed") or {}
    if multi:
        db.add(
            MultiSeed(
                critical_prob_mean_mean=float(multi.get("criticalProbMeanMean") or 0),
                critical_prob_mean_std=float(multi.get("criticalProbMeanStd") or 0),
                critical_rate_mean=float(multi.get("criticalRateMean") or 0),
                critical_rate_std=float(multi.get("criticalRateStd") or 0),
                samples_json=multi.get("samples") or [],
            )
        )

    ensure_demo_user(db)
    db.commit()
    return {
        "segments": len(segments),
        "edges": len(edges),
        "shapFeatures": len(shap_rows),
        "scenarios": len(scenarios),
    }


def ingest_from_artifacts(db: Session, *, rebuild: bool = False) -> dict[str, int]:
    maybe_rebuild_from_artifacts(rebuild=rebuild)
    payload = load_real_data()
    return ingest_payload(db, payload)
