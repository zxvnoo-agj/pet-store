
from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    pet_type: str
    icon: str | None = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    parent_id: int | None = None
    level: int = 1


class CategoryResponse(CategoryBase):
    id: int
    parent_id: int | None = None
    level: int
    is_active: bool
    children: list["CategoryResponse"] = []

    class Config:
        from_attributes = True


CategoryResponse.model_rebuild()
