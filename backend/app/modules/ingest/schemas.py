from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    rebuild: bool = Field(
        default=False,
        description="If true, run scripts/build_data.py before loading realData.json",
    )


class IngestResponse(BaseModel):
    ok: bool = True
    counts: dict[str, int]
