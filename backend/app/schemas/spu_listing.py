from datetime import datetime

from pydantic import BaseModel


class SpuListingBase(BaseModel):
    platform: str
    shop_name: str
    goods_id: str | None = None
    title: str
    price: float
    original_price: float | None = None
    url: str
    image_url: str | None = None
    sales_count: int | None = None
    match_confidence: float | None = None
    match_status: str = "linked"


class SpuListingCreate(SpuListingBase):
    spu_id: int


class SpuListingResponse(SpuListingBase):
    id: int
    spu_id: int | None = None
    spu_name: str | None = None
    last_synced_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class LinkListingRequest(BaseModel):
    spu_id: int
