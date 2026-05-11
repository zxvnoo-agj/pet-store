from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PriceRange(BaseModel):
    min: float
    max: float


class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    currency: str = "CNY"
    image_urls: List[str] = []
    pros: List[str] = []
    cons: List[str] = []
    ratings: Dict[str, float] = {}
    description: Optional[str] = None
    ingredients: List[str] = []
    specifications: Dict[str, Any] = {}
    source_url: Optional[str] = None
    source_platform: Optional[str] = None


class ProductCreate(ProductBase):
    category_id: int


class ProductListResponse(ProductBase):
    id: int
    review_count: int = 0

    class Config:
        from_attributes = True


class ProductDetailResponse(ProductListResponse):
    category: Optional[dict] = None
    favorite_count: int = 0

    class Config:
        from_attributes = True


class ProductFilter(BaseModel):
    category_id: Optional[int] = None
    pet_type: Optional[str] = None
    brand: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    sort: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
