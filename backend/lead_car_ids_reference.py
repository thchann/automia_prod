"""
Reference helpers for multi-car lead links in FastAPI + SQLAlchemy (merge into your Railway app).

This repo's `main.py` is a CORS stub with no lead CRUD. Copy the patterns below into your real
service: persist `car_ids` (JSON/JSONB array or a junction table) and return both `car_id` and
`car_ids` from GET list/detail and PUT responses so the desktop client stays in sync.

Usage sketch (PUT /leads/{id}):
    primary, ordered = normalize_car_links_for_write(payload.car_id, payload.car_ids)
    row.car_id = primary
    row.car_ids = ordered  # or sync junction table from `ordered`
"""

from __future__ import annotations

from uuid import UUID


def _dedupe_preserve_order(ids: list[UUID]) -> list[UUID]:
    seen: set[UUID] = set()
    out: list[UUID] = []
    for x in ids:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def normalize_car_links_for_write(
    car_id: UUID | None,
    car_ids: list[UUID] | None,
) -> tuple[UUID | None, list[UUID] | None]:
    """
    Apply incoming create/update fields. Primary `car_id` is the first entry in the ordered list.

    - If `car_ids` is sent (including empty list), it wins: primary = first element or None.
    - If only `car_id` is sent, store `car_ids = [car_id]` when non-null.
    """
    if car_ids is not None:
        uniq = _dedupe_preserve_order(car_ids)
        if not uniq:
            return None, None
        return uniq[0], uniq
    if car_id is not None:
        return car_id, [car_id]
    return None, None


def serialize_lead_car_fields_for_response(
    car_id: UUID | None,
    car_ids: list[UUID] | None,
) -> tuple[UUID | None, list[UUID] | None]:
    """
    Shape for JSON list/detail: expose `car_ids` whenever at least one car is linked.
    If the DB only stores `car_id`, derive `car_ids = [car_id]`.
    """
    if car_ids is not None and len(car_ids) > 0:
        return car_id, car_ids
    if car_id is not None:
        return car_id, [car_id]
    return None, None


if __name__ == "__main__":
    u1 = UUID("00000000-0000-0000-0000-000000000001")
    u2 = UUID("00000000-0000-0000-0000-000000000002")

    assert normalize_car_links_for_write(None, None) == (None, None)
    assert normalize_car_links_for_write(u1, None) == (u1, [u1])
    assert normalize_car_links_for_write(None, [u2, u1]) == (u2, [u2, u1])
    assert normalize_car_links_for_write(u1, []) == (None, None)

    assert serialize_lead_car_fields_for_response(u1, None) == (u1, [u1])
    assert serialize_lead_car_fields_for_response(None, [u1, u2]) == (None, [u1, u2])
    assert serialize_lead_car_fields_for_response(None, None) == (None, None)

    print("lead_car_ids_reference: ok")


# -----------------------------------------------------------------------------
# Merge the following into your Railway FastAPI + SQLAlchemy service (not wired here).
# -----------------------------------------------------------------------------

# Postgres: add a column (or use a lead_cars junction table for strict M2M).
#
#   ALTER TABLE leads ADD COLUMN IF NOT EXISTS car_ids JSONB DEFAULT '[]'::jsonb;
#   -- Keep existing car_id UUID FK as "primary" for filters; sync with car_ids[0] in app code.
#
# SQLAlchemy model (illustrative):
#
#   from sqlalchemy import Column
#   from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
#
#   class Lead(Base):
#       __tablename__ = "leads"
#       id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
#       user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
#       car_id = Column(PG_UUID(as_uuid=True), ForeignKey("cars.id"), nullable=True)
#       car_ids = Column(JSONB, nullable=True)  # ordered list of UUID strings or native UUIDs
#
# Pydantic (align with desktop `@automia/api` LeadUpdate / LeadResponse):
#
#   class LeadUpdate(BaseModel):
#       car_id: UUID | None = None
#       car_ids: list[UUID] | None = None
#       # ... other fields
#
# In your PUT handler, after loading the row:
#       primary, ordered = normalize_car_links_for_write(payload.car_id, payload.car_ids)
#       row.car_id = primary
#       row.car_ids = [str(x) for x in ordered] if ordered else None  # or list of UUIDs if JSONB supports it
#
# In list/detail serializers, always call:
#       cid, cids = serialize_lead_car_fields_for_response(row.car_id, parsed_car_ids_from_json(row))
#       return LeadItem(car_id=cid, car_ids=cids, ...)
