from pydantic import BaseModel, ConfigDict


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=_to_camel,
    )


class SegmentOut(CamelModel):
    id: str
    node_id: int
    name: str
    area: str
    predicted_class: str
    actual_class: str
    prediction_correct: bool
    safe_prob: float
    warning_prob: float
    critical_prob: float
    priority_tier: str
    priority_score: float
    propagation_uplift: float
    temp_avg: float
    press_avg: float
    ph_level: float
    pco2_psi: float
    h2s_ppm: float
    chloride_ppm: float
    inhibitor_ppm: float
    segment_age: float
    wall_thick_nom: float
    corrosion_rate_mm_yr: float
    thickness_loss_pct: float
    nlp_anomaly_score: float
    inspection_note: str
    recommended_action: str
    target_sla: str


class SegmentListOut(BaseModel):
    items: list[SegmentOut]
    total: int
