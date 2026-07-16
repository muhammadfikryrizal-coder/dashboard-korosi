from pydantic import BaseModel, ConfigDict


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


class EdgeOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=_to_camel,
    )

    source: int
    target: int
    flow_vol: float
    distance: float
    elevation_delta: float


class EdgeListOut(BaseModel):
    items: list[EdgeOut]
    total: int
