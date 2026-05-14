// Data layer for the PipelineGuard-AI dashboard.
//
// Source of truth: `pipelineguard-ai/src/lib/realData.json`, generated from
// `pipelineguard-ai/artifacts/{node_data,edge_data,model_config}.{csv,json}`
// by `pipelineguard-ai/scripts/build_data.py`. That script replicates the
// inference + rules pipeline used by the Streamlit reference app
// (`src/inference.py` + `src/rules_engine.py`), so the React dashboard renders
// the same predictions and priority scores produced by the GraphSAGE export.
//
// The whole pipeline stays inside `pipelineguard-ai/` — no parent directories
// are read.
//
// To refresh the data after retraining or updating the CSVs:
//   python3 scripts/build_data.py     # from inside pipelineguard-ai/

import realData from "./realData.json";

export const SEGMENTS = realData.segments;
export const EDGES = realData.edges;
export const SHAP_GLOBAL_IMPORTANCE = realData.shapImportance;
export const MODEL_METRICS = realData.modelMetrics;
export const STRESS_SUMMARY = realData.stressSummary;
export const MULTI_SEED = realData.multiSeed;
export const SCENARIOS = realData.scenarios;

// Backwards-compatible alias used by older component code.
export const MOCK_SEGMENTS = SEGMENTS;
