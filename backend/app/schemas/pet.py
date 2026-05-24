from datetime import datetime

from pydantic import BaseModel, Field, field_validator

VALID_SPECIES = {"cat", "dog", "bird", "fish", "reptile", "small_pet", "other"}


class PetBreedResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class PetCreate(BaseModel):
    species: str
    breed_id: int | None = None
    nickname: str | None = None
    age_months: int | None = Field(default=None, ge=0)
    weight_kg: float | None = Field(default=None, gt=0)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("species")
    @classmethod
    def validate_species(cls, v: str) -> str:
        if v not in VALID_SPECIES:
            raise ValueError(f"Invalid species: {v}. Must be one of {VALID_SPECIES}")
        return v


class PetUpdate(BaseModel):
    species: str | None = None
    breed_id: int | None = None
    nickname: str | None = None
    age_months: int | None = Field(default=None, ge=0)
    weight_kg: float | None = Field(default=None, gt=0)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("species")
    @classmethod
    def validate_species(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_SPECIES:
            raise ValueError(f"Invalid species: {v}. Must be one of {VALID_SPECIES}")
        return v


class PetResponse(BaseModel):
    id: int
    species: str
    breed: PetBreedResponse | None = None
    nickname: str
    age_months: int | None = None
    weight_kg: float | None = None
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PetListResponse(BaseModel):
    pets: list[PetResponse]
    total: int


class BreedListResponse(BaseModel):
    breeds: list[PetBreedResponse]


class LastSelectedPetResponse(BaseModel):
    pet_id: int | None = None


class LastSelectedPetUpdate(BaseModel):
    pet_id: int
