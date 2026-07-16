from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.metrics.schemas import (
    ModelMetricsOut,
    MultiSeedOut,
    ScenarioOut,
    ShapFeatureOut,
    StressSummaryOut,
)
from app.modules.metrics.service import (
    get_model_metrics,
    get_multi_seed,
    get_stress,
    list_scenarios,
    list_shap,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/model", response_model=ModelMetricsOut, response_model_by_alias=True)
def model_metrics(db: DbSession, _user: CurrentUser) -> ModelMetricsOut:
    row = get_model_metrics(db)
    return ModelMetricsOut(
        model_name=row.model_name,
        version=row.version,
        architecture=row.architecture,
        physics_model=row.physics_model,
        classes=list(row.classes_json or []),
        best_test_f1=row.best_test_f1,
        test_accuracy=row.test_accuracy,
        inference_mode=row.inference_mode,
    )


@router.get("/shap", response_model=list[ShapFeatureOut], response_model_by_alias=True)
def shap(db: DbSession, _user: CurrentUser) -> list[ShapFeatureOut]:
    return [ShapFeatureOut.model_validate(r) for r in list_shap(db)]


@router.get("/scenarios", response_model=list[ScenarioOut], response_model_by_alias=True)
def scenarios(db: DbSession, _user: CurrentUser) -> list[ScenarioOut]:
    return [ScenarioOut.model_validate(r) for r in list_scenarios(db)]


@router.get("/stress", response_model=StressSummaryOut, response_model_by_alias=True)
def stress(db: DbSession, _user: CurrentUser) -> StressSummaryOut:
    return StressSummaryOut.model_validate(get_stress(db))


@router.get("/multi-seed", response_model=MultiSeedOut, response_model_by_alias=True)
def multi_seed(db: DbSession, _user: CurrentUser) -> MultiSeedOut:
    row = get_multi_seed(db)
    return MultiSeedOut(
        critical_prob_mean_mean=row.critical_prob_mean_mean,
        critical_prob_mean_std=row.critical_prob_mean_std,
        critical_rate_mean=row.critical_rate_mean,
        critical_rate_std=row.critical_rate_std,
        samples=list(row.samples_json or []),
    )
