"""Build realData.json for the React app by running the PipelineGuard-AI
inference + rules pipeline over the project-local `artifacts/` folder.

This script intentionally only reads files inside `pipelineguard-ai/` so the
project stays standalone (no references to parent repo directories).

Stdlib-only so it can run anywhere without installing pandas/torch.
"""

from __future__ import annotations

import csv
import json
import math
import random
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ARTIFACT_DIR = PROJECT_ROOT / "artifacts"
OUTPUT_PATH = PROJECT_ROOT / "src" / "lib" / "realData.json"

CLASSES = ["Safe", "Warning", "Critical"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}

# Priority tier metadata copied from src/rules_engine.py.
ACTION_MAP = {
    "P1": "UT segera + peningkatan inhibitor + tinjau tekanan",
    "P2": "Inspeksi terarah + penyesuaian kimiawi",
    "P3": "Monitoring rutin + siklus PM normal",
}
SLA_MAP = {
    "P1": "<=24 jam",
    "P2": "<=7 hari",
    "P3": "<=30 hari",
}


def _to_float(value, default=0.0):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def load_nodes(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_edges(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_model_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


# ---------- inference helpers (port of src/inference.py) -----------------


def calibrated_probs(node: dict, corr_norm: float, acidic: float) -> tuple[float, float, float]:
    """Port of `_probs_from_exported_labels` for a single node."""
    cls = (node.get("predicted_risk_class") or "Safe").strip() or "Safe"
    s = max(0.0, min(1.0, 0.65 * corr_norm + 0.35 * acidic))

    if cls == "Critical":
        critical = 0.62 + 0.35 * s
        warning = 0.03 + 0.08 * (1.0 - s)
        safe = max(0.01, 1.0 - critical - warning)
    elif cls == "Warning":
        critical = 0.35 + 0.20 * s
        warning = 0.38 + 0.30 * (1.0 - abs(0.5 - s))
        safe = max(0.01, 1.0 - critical - warning)
    else:
        critical = 0.03 + 0.22 * s
        warning = 0.10 + 0.25 * s
        safe = max(0.01, 1.0 - critical - warning)

    total = safe + warning + critical
    return safe / total, warning / total, critical / total


def heuristic_probs(node: dict) -> tuple[float, float, float]:
    """Port of `_heuristic_probabilities` for a single node."""
    ph = _to_float(node.get("ph_level"), 7.0)
    h2s = _to_float(node.get("h2s_ppm"), 0.0)
    chloride = _to_float(node.get("chloride_ppm"), 0.0)
    inhibitor = _to_float(node.get("inhibitor_ppm"), 0.0)
    corr = _to_float(node.get("corrosion_rate_mm_yr"), 0.0)
    anom = _to_float(node.get("nlp_anomaly_score"), 0.0)

    risk_raw = (
        1.8 * corr
        + 0.012 * h2s
        + 0.0012 * chloride
        + 1.2 * max(0.0, 7.0 - ph)
        + 1.1 * anom
        - 0.01 * inhibitor
    )

    def sigmoid(x: float) -> float:
        x = max(-20.0, min(20.0, x))
        return 1.0 / (1.0 + math.exp(-x))

    critical = sigmoid(risk_raw - 1.4)
    warning = max(0.01, min(0.90, sigmoid(risk_raw - 0.8) - critical * 0.55))
    safe = max(0.01, min(0.98, 1.0 - critical - warning))
    total = safe + warning + critical
    return safe / total, warning / total, critical / total


def assign_priority(predicted_class: str, critical_prob: float) -> str:
    if predicted_class == "Critical" or critical_prob >= 0.60:
        return "P1"
    if predicted_class == "Warning" or critical_prob >= 0.35:
        return "P2"
    return "P3"


def derive_area(node_id: int, total: int) -> str:
    """Synthesize an area label so the React UI keeps OFFSHORE/MAIN/ONSHORE
    badges. Real artifacts do not include an area column."""
    third = max(1, total // 3)
    if node_id < third:
        return "OFFSHORE"
    if node_id < 2 * third:
        return "MAIN"
    return "ONSHORE"


def area_prefix(area: str) -> str:
    return {"OFFSHORE": "SEG-OFF", "MAIN": "SEG-MAIN", "ONSHORE": "SEG-ON"}.get(area, "SEG")


def compute_propagation_uplift(n: int, edges: list[tuple[int, int]], critical_probs: list[float]) -> list[float]:
    if not edges:
        return [0.0] * n
    adjacency = [[0.0] * n for _ in range(n)]
    for src, dst in edges:
        if 0 <= src < n and 0 <= dst < n:
            adjacency[src][dst] = 1.0
            adjacency[dst][src] = 1.0
    uplifts: list[float] = []
    for i in range(n):
        degree = sum(adjacency[i])
        if degree == 0:
            uplifts.append(0.0)
            continue
        neighbor_mean = sum(adjacency[i][j] * critical_probs[j] for j in range(n)) / degree
        uplifts.append(neighbor_mean - critical_probs[i])
    return uplifts


def correlation(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    if n == 0:
        return 0.0
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx == 0 or dy == 0:
        return 0.0
    return num / (dx * dy)


def shap_like_importance(nodes: list[dict], critical_probs: list[float], feature_columns: list[str]) -> list[dict]:
    """Approximate SHAP global importance using |Pearson r| between each
    feature and critical_prob. Good enough for an explainability bar chart
    when the real Kernel SHAP run isn't available."""
    interesting = [
        "corrosion_rate_mm_yr",
        "h2s_ppm",
        "press_avg",
        "pco2_psi",
        "ph_level",
        "chloride_ppm",
        "inhibitor_ppm",
        "segment_age",
        "temp_avg",
        "wall_thick_nom",
        "nlp_anomaly_score",
    ]
    features = [f for f in interesting if f in feature_columns or any(f in n for n in nodes)]
    out = []
    for feat in features:
        xs = [_to_float(n.get(feat), 0.0) for n in nodes]
        r = abs(correlation(xs, critical_probs))
        out.append({"feature": feat, "importance": round(r, 3)})
    out.sort(key=lambda x: x["importance"], reverse=True)
    return out


# ---------- main pipeline ------------------------------------------------


def build():
    nodes_raw = load_nodes(ARTIFACT_DIR / "node_data.csv")
    edges_raw = load_edges(ARTIFACT_DIR / "edge_data.csv")
    model_config = load_model_config(ARTIFACT_DIR / "model_config.json")
    n = len(nodes_raw)

    # Normalize corrosion rate for calibrated probability shaping.
    corr_values = [_to_float(node.get("corrosion_rate_mm_yr"), 0.0) for node in nodes_raw]
    cmin, cmax = min(corr_values), max(corr_values)
    crange = max(cmax - cmin, 1e-6)

    safe_probs: list[float] = []
    warning_probs: list[float] = []
    critical_probs: list[float] = []
    predicted_classes: list[str] = []

    has_exported_labels = any(node.get("predicted_risk_class") for node in nodes_raw)
    inference_mode = "artifact_export" if has_exported_labels else "heuristic"

    for node, corr in zip(nodes_raw, corr_values):
        ph = _to_float(node.get("ph_level"), 7.0)
        corr_norm = (corr - cmin) / crange
        acidic = max(0.0, (7.0 - ph) / 2.0)
        if has_exported_labels:
            sp, wp, cp = calibrated_probs(node, corr_norm, acidic)
            cls = (node.get("predicted_risk_class") or "Safe").strip() or "Safe"
        else:
            sp, wp, cp = heuristic_probs(node)
            cls = CLASSES[max(range(3), key=lambda i: (sp, wp, cp)[i])]
        safe_probs.append(sp)
        warning_probs.append(wp)
        critical_probs.append(cp)
        predicted_classes.append(cls)

    # Build edge index (skip self-loops).
    edges: list[tuple[int, int]] = []
    for e in edges_raw:
        s = _to_int(e.get("source"), -1)
        t = _to_int(e.get("target"), -1)
        if s != t and 0 <= s < n and 0 <= t < n:
            edges.append((s, t))

    uplifts = compute_propagation_uplift(n, edges, critical_probs)

    # Rules engine (priority tier/score/action).
    thickness = [_to_float(node.get("thickness_loss_pct"), 0.0) for node in nodes_raw]
    max_corr = max(corr_values + [1e-6])

    segments = []
    for i, node in enumerate(nodes_raw):
        cls = predicted_classes[i]
        sp, wp, cp = safe_probs[i], warning_probs[i], critical_probs[i]
        tier = assign_priority(cls, cp)
        priority_score = (
            0.45 * cp
            + 0.25 * (thickness[i] / 45.0)
            + 0.20 * (corr_values[i] / max_corr)
            + 0.10 * max(0.0, min(1.0, uplifts[i]))
        )
        priority_score = max(0.0, min(1.0, priority_score))
        area = derive_area(i, n)
        node_id = _to_int(node.get("node_id"), i)
        segments.append({
            "id": str(node_id),
            "nodeId": node_id,
            "name": f"{area_prefix(area)}-{node_id:03d}",
            "area": area,
            "predictedClass": cls,
            "actualClass": (node.get("risk_class") or "").strip() or None,
            "predictionCorrect": (node.get("prediction_correct") or "").strip().lower() == "true",
            "safeProb": round(sp, 4),
            "warningProb": round(wp, 4),
            "criticalProb": round(cp, 4),
            "priorityTier": tier,
            "priorityScore": round(priority_score, 4),
            "propagationUplift": round(uplifts[i], 4),
            "tempAvg": round(_to_float(node.get("temp_avg")), 2),
            "pressAvg": round(_to_float(node.get("press_avg")), 2),
            "phLevel": round(_to_float(node.get("ph_level")), 2),
            "pco2Psi": round(_to_float(node.get("pco2_psi")), 3),
            "h2sPpm": round(_to_float(node.get("h2s_ppm")), 2),
            "chloridePpm": round(_to_float(node.get("chloride_ppm")), 1),
            "inhibitorPpm": round(_to_float(node.get("inhibitor_ppm")), 2),
            "segmentAge": round(_to_float(node.get("segment_age")), 2),
            "wallThickNom": round(_to_float(node.get("wall_thick_nom")), 2),
            "corrosionRateMmYr": round(corr_values[i], 4),
            "thicknessLossPct": round(thickness[i], 2),
            "nlpAnomalyScore": round(_to_float(node.get("nlp_anomaly_score")), 3),
            "inspectionNote": (node.get("inspection_note") or "").strip(),
            "recommendedAction": ACTION_MAP[tier],
            "targetSla": SLA_MAP[tier],
        })

    # Edge list for the JS network map.
    edge_records = []
    for e in edges_raw:
        s = _to_int(e.get("source"), -1)
        t = _to_int(e.get("target"), -1)
        if 0 <= s < n and 0 <= t < n:
            edge_records.append({
                "source": s,
                "target": t,
                "flowVol": round(_to_float(e.get("flow_vol")), 3),
                "distance": round(_to_float(e.get("distance")), 2),
                "elevationDelta": round(_to_float(e.get("elevation_delta")), 2),
            })

    # SHAP-like importance.
    feature_columns = model_config.get("feature_columns", [])
    shap_importance = shap_like_importance(nodes_raw, critical_probs, feature_columns)

    # ---- stress test (port of src/inference.run_stress_test) ----
    stress_probs_critical: list[float] = []
    stress_classes: list[str] = []
    for node in nodes_raw:
        stressed = dict(node)
        stressed["h2s_ppm"] = _to_float(node.get("h2s_ppm")) * 1.2
        stressed["chloride_ppm"] = _to_float(node.get("chloride_ppm")) * 1.15
        stressed["inhibitor_ppm"] = _to_float(node.get("inhibitor_ppm")) * 0.85
        stressed["ph_level"] = _to_float(node.get("ph_level"), 7.0) - 0.25
        sp, wp, cp = heuristic_probs(stressed)
        stress_probs_critical.append(cp)
        stress_classes.append(CLASSES[max(range(3), key=lambda i: (sp, wp, cp)[i])])

    std_critical_rate = sum(1 for c in predicted_classes if c == "Critical") / n
    stress_critical_rate = sum(1 for c in stress_classes if c == "Critical") / n
    std_avg_cp = sum(critical_probs) / n
    stress_avg_cp = sum(stress_probs_critical) / n
    std_avg_priority = sum(s["priorityScore"] for s in segments) / n

    # ---- multi-seed simulation (port of pages/4_Validasi_dan_Metrik.py) ----
    rng = random.Random(42)
    seed_rows = []
    for seed in range(1, 11):
        seed_rng = random.Random(seed)
        sampled = []
        rates = 0
        for cp in critical_probs:
            noise = seed_rng.gauss(0.0, 0.015)
            v = max(0.0, min(1.0, cp + noise))
            sampled.append(v)
            if v >= 0.60:
                rates += 1
        seed_rows.append({
            "seed": seed,
            "criticalProbMean": round(sum(sampled) / len(sampled), 4),
            "criticalRateEst": round(rates / len(sampled), 4),
        })
    # also derive across-seed mean/std using the noise distribution itself,
    # mirroring the streamlit page.
    cp_means = [row["criticalProbMean"] for row in seed_rows]
    rate_means = [row["criticalRateEst"] for row in seed_rows]

    def mean_std(values: list[float]) -> tuple[float, float]:
        m = sum(values) / len(values)
        var = sum((v - m) ** 2 for v in values) / (len(values) - 1) if len(values) > 1 else 0.0
        return m, math.sqrt(var)

    cp_mean_mean, cp_mean_std = mean_std(cp_means)
    rate_mean, rate_std = mean_std(rate_means)

    # ---- scenario reference (notebook validation table) ----
    scenarios = [
        {"scenario": "Uji standar (checkpoint terbaik)", "accuracy": 1.0, "macroF1": 1.0, "criticalF1": 1.0, "purpose": "Performa pada kondisi nominal"},
        {"scenario": "Uji standar (epoch terakhir)", "accuracy": 1.0, "macroF1": 1.0, "criticalF1": 1.0, "purpose": "Snapshot akhir pelatihan"},
        {"scenario": "Uji stress (GraphSAGE tanpa konteks edge)", "accuracy": 0.6957, "macroF1": 0.7165, "criticalF1": 0.8889, "purpose": "Robustness saat degradasi sensor"},
    ]

    payload = {
        "generatedFrom": "artifacts/ via pipelineguard-ai/scripts/build_data.py",
        "modelMetrics": {
            "modelName": model_config.get("model_name"),
            "version": model_config.get("version"),
            "architecture": model_config.get("architecture"),
            "physicsModel": model_config.get("physics_model"),
            "classes": model_config.get("classes", CLASSES),
            "bestTestF1": model_config.get("metrics", {}).get("best_test_f1"),
            "testAccuracy": model_config.get("metrics", {}).get("test_accuracy"),
            "inferenceMode": inference_mode,
        },
        "segments": segments,
        "edges": edge_records,
        "shapImportance": shap_importance,
        "stressSummary": {
            "stdCriticalRate": round(std_critical_rate, 4),
            "stressCriticalRate": round(stress_critical_rate, 4),
            "stdAvgCriticalProb": round(std_avg_cp, 4),
            "stressAvgCriticalProb": round(stress_avg_cp, 4),
            "stdAvgPriorityScore": round(std_avg_priority, 4),
        },
        "multiSeed": {
            "criticalProbMeanMean": round(cp_mean_mean, 4),
            "criticalProbMeanStd": round(cp_mean_std, 4),
            "criticalRateMean": round(rate_mean, 4),
            "criticalRateStd": round(rate_std, 4),
            "samples": seed_rows,
        },
        "scenarios": scenarios,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {OUTPUT_PATH} ({len(segments)} segments, {len(edge_records)} edges)")


if __name__ == "__main__":
    build()
