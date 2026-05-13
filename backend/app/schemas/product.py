from typing import Any

from pydantic import BaseModel, Field


class PriceRange(BaseModel):
    min: float
    max: float


class CategoryInfo(BaseModel):
    id: int
    name: str
    pet_type: str

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    brand: str | None = None
    price_min: float | None = None
    price_max: float | None = None
    currency: str = "CNY"
    image_urls: list[str] = []
    pros: list[str] = []
    cons: list[str] = []
    ratings: dict[str, float] = {}
    description: str | None = None
    ingredients: list[str] = []
    specifications: dict[str, Any] = {}
    source_url: str | None = None
    source_platform: str | None = None


class ProductCreate(ProductBase):
    category_id: int


class ProductListResponse(ProductBase):
    id: int
    review_count: int = 0

    class Config:
        from_attributes = True


class ProductDetailResponse(ProductListResponse):
    category: CategoryInfo | None = None
    favorite_count: int = 0

    class Config:
        from_attributes = True


class ProductFilter(BaseModel):
    category_id: int | None = None
    pet_type: str | None = None
    brand: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    sort: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
