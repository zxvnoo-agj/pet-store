from datetime import datetime

from pydantic import BaseModel, Field


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
    goods_sign: str | None = None
    sku_specs: list | None = None
    service_tags: list | None = None
    is_primary: bool = False
    last_sync_error: str | None = None
    match_confidence: float | None = None
    match_status: str = "linked"


class SpuListingCreate(SpuListingBase):
    spu_id: int


class SpuListingManualCreate(BaseModel):
    platform: str = "pdd"
    shop_name: str = ""
    goods_id: str | None = None
    goods_sign: str | None = None
    title: str = Field(..., min_length=1, max_length=512)
    price: float = Field(0, ge=0)
    original_price: float | None = Field(None, ge=0)
    url: str = ""
    image_url: str | None = None
    sales_count: int | None = None
    sku_specs: list | None = None
    service_tags: list | None = None
    is_primary: bool = False
    match_status: str = "linked"


class SpuListingManualUpdate(BaseModel):
    platform: str | None = None
    shop_name: str | None = None
    goods_id: str | None = None
    goods_sign: str | None = None
    title: str | None = Field(None, min_length=1, max_length=512)
    price: float | None = Field(None, ge=0)
    original_price: float | None = Field(None, ge=0)
    url: str | None = None
    image_url: str | None = None
    sales_count: int | None = None
    sku_specs: list | None = None
    service_tags: list | None = None
    is_primary: bool | None = None
    match_status: str | None = None


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
