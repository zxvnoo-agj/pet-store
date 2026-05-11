from typing import Optional, List
from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    pet_type: str
    icon: Optional[str] = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    parent_id: Optional[int] = None
    level: int = 1


class CategoryResponse(CategoryBase):
    id: int
    parent_id: Optional[int] = None
    level: int
    is_active: bool
    children: List["CategoryResponse"] = []

    class Config:
        from_attributes = True


CategoryResponse.model_rebuild()
