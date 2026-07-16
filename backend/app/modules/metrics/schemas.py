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


class ModelMetricsOut(CamelModel):
    model_name: str
    version: str
    architecture: str
    physics_model: str
    classes: list[str]
    best_test_f1: float
    test_accuracy: float
    inference_mode: str


class ShapFeatureOut(CamelModel):
    feature: str
    importance: float


class ScenarioOut(CamelModel):
    scenario: str
    accuracy: float
    macro_f1: float
    critical_f1: float
    purpose: str


class StressSummaryOut(CamelModel):
    std_critical_rate: float
    stress_critical_rate: float
    std_avg_critical_prob: float
    stress_avg_critical_prob: float
    std_avg_priority_score: float


class MultiSeedOut(CamelModel):
    critical_prob_mean_mean: float
    critical_prob_mean_std: float
    critical_rate_mean: float
    critical_rate_std: float
    samples: list[dict]
