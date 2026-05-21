from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CategoryInfo(BaseModel):
    id: int
    name: str
    pet_type: str

    class Config:
        from_attributes = True


class SpuBase(BaseModel):
    brand: str
    name: str
    model: str
    pet_type: str = "cat"
    description: str | None = None
    ingredients: list[str] = []
    nutrition: dict[str, Any] = {}
    pros: list[str] = []
    cons: list[str] = []
    extra_attrs: dict[str, Any] = {}
    currency: str = "CNY"
    image_urls: list[str] = []
    status: str = "active"


class SpuCreate(SpuBase):
    category_id: int


class SpuUpdate(BaseModel):
    brand: str | None = None
    name: str | None = None
    model: str | None = None
    pet_type: str | None = None
    description: str | None = None
    ingredients: list[str] | None = None
    nutrition: dict[str, Any] | None = None
    pros: list[str] | None = None
    cons: list[str] | None = None
    extra_attrs: dict[str, Any] | None = None
    currency: str | None = None
    image_urls: list[str] | None = None
    status: str | None = None
    category_id: int | None = None


class SpuResponse(SpuBase):
    id: int
    category_id: int
    price_min: float | None = None
    price_max: float | None = None
    category: CategoryInfo | None = None
    listing_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SpuListResponse(BaseModel):
    items: list[SpuResponse]
    total: int


class SpuFilter(BaseModel):
    category_id: int | None = None
    pet_type: str | None = None
    brand: str | None = None
    status: str | None = None
    search: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    sort: str | None = None
    page: int = 1
    page_size: int = 20


# Mini-program specific schemas
class SpuMiniProgramListResponse(BaseModel):
    id: int
    brand: str
    name: str
    model: str
    pet_type: str
    category: CategoryInfo | None = None
    price_min: float | None = None
    price_max: float | None = None
    currency: str = "CNY"
    image_urls: list[str] = []
    rating: float = 0.0
    review_count: int = 0
    status: str = "active"

    class Config:
        from_attributes = True


class SpuMiniProgramDetailResponse(SpuBase):
    id: int
    category_id: int
    price_min: float | None = None
    price_max: float | None = None
    category: CategoryInfo | None = None
    listing_count: int = 0
    is_favorited: bool = False

    class Config:
        from_attributes = True


class SpuMiniProgramListingResponse(BaseModel):
    id: int
    platform: str
    shop_name: str
    title: str
    price: float
    original_price: float | None = None
    url: str
    image_url: str | None = None
    sales_count: int | None = None
    promotion_url: str | None = None

    class Config:
        from_attributes = True
