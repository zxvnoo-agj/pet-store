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
    created_at: str | None = None
    updated_at: str | None = None

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
    page: int = 1
    page_size: int = 20
