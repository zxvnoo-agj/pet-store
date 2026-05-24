import json

from loguru import logger
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pet import Pet
from app.models.pet_breed import PetBreed
from app.models.user import User
from app.schemas.pet import PetCreate, PetUpdate

MAX_PETS_PER_USER = 5
MAX_NOTES_LENGTH = 500


class PetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_user_pets(self, user_id: int) -> list[Pet]:
        result = await self.db.execute(
            select(Pet)
            .options(selectinload(Pet.breed))
            .where(Pet.user_id == user_id)
            .order_by(Pet.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_pet(self, pet_id: int, user_id: int) -> Pet | None:
        result = await self.db.execute(
            select(Pet)
            .options(selectinload(Pet.breed))
            .where(and_(Pet.id == pet_id, Pet.user_id == user_id))
        )
        return result.scalar_one_or_none()

    async def count_user_pets(self, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Pet.id)).where(Pet.user_id == user_id)
        )
        return result.scalar() or 0

    async def create_pet(self, user_id: int, data: PetCreate) -> Pet:
        count = await self.count_user_pets(user_id)
        if count >= MAX_PETS_PER_USER:
            raise ValueError(f"最多添加{MAX_PETS_PER_USER}只宠物")

        nickname = data.nickname or ""
        duplicate = await self._check_duplicate(user_id, data.species, nickname)
        if duplicate:
            raise ValueError("已存在同名宠物")

        if data.breed_id is not None:
            await self._validate_breed_species(data.breed_id, data.species)

        notes = data.notes
        if notes and len(notes) > MAX_NOTES_LENGTH:
            notes = notes[:MAX_NOTES_LENGTH]

        pet = Pet(
            user_id=user_id,
            species=data.species,
            breed_id=data.breed_id,
            nickname=nickname,
            age_months=data.age_months,
            weight_kg=data.weight_kg,
            notes=notes,
        )
        self.db.add(pet)
        await self.db.commit()
        await self.db.refresh(pet)

        await self._invalidate_suggested_questions_cache(user_id)

        result = await self.db.execute(
            select(Pet).options(selectinload(Pet.breed)).where(Pet.id == pet.id)
        )
        return result.scalar_one()

    async def update_pet(self, pet_id: int, user_id: int, data: PetUpdate) -> Pet:
        pet = await self.get_pet(pet_id, user_id)
        if not pet:
            raise ValueError("宠物不存在")

        update_data = data.model_dump(exclude_unset=True)

        if "species" in update_data or "nickname" in update_data:
            species = update_data.get("species", pet.species)
            nickname = update_data.get("nickname", pet.nickname)
            if nickname is None:
                nickname = pet.nickname
            if await self._check_duplicate(user_id, species, nickname, exclude_id=pet_id):
                raise ValueError("已存在同名宠物")

        if "breed_id" in update_data and update_data["breed_id"] is not None:
            species = update_data.get("species", pet.species)
            await self._validate_breed_species(update_data["breed_id"], species)

        if "notes" in update_data and update_data["notes"] is not None:
            notes = update_data["notes"]
            if len(notes) > MAX_NOTES_LENGTH:
                update_data["notes"] = notes[:MAX_NOTES_LENGTH]

        for key, value in update_data.items():
            setattr(pet, key, value)

        await self.db.commit()
        await self.db.refresh(pet)

        await self._invalidate_suggested_questions_cache(user_id)

        result = await self.db.execute(
            select(Pet).options(selectinload(Pet.breed)).where(Pet.id == pet.id)
        )
        return result.scalar_one()

    async def delete_pet(self, pet_id: int, user_id: int) -> bool:
        pet = await self.get_pet(pet_id, user_id)
        if not pet:
            return False

        await self.db.delete(pet)
        await self.db.commit()

        await self._invalidate_suggested_questions_cache(user_id)

        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user and user.profile and user.profile.get("last_selected_pet_id") == pet_id:
            user.profile["last_selected_pet_id"] = None
            await self.db.commit()

        return True

    async def get_breeds(self, species: str) -> list[PetBreed]:
        result = await self.db.execute(
            select(PetBreed)
            .where(and_(PetBreed.species == species, PetBreed.is_active == True))
            .order_by(PetBreed.sort_order.asc(), PetBreed.name.asc())
        )
        return list(result.scalars().all())

    async def get_last_selected_pet_id(self, user_id: int) -> int | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None
        return user.profile.get("last_selected_pet_id") if user.profile else None

    async def set_last_selected_pet_id(self, user_id: int, pet_id: int) -> None:
        pet = await self.get_pet(pet_id, user_id)
        if not pet:
            raise ValueError("宠物不存在")

        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("用户不存在")

        if user.profile is None:
            user.profile = {}
        user.profile["last_selected_pet_id"] = pet_id
        await self.db.commit()

    async def _check_duplicate(
        self, user_id: int, species: str, nickname: str, exclude_id: int | None = None
    ) -> bool:
        conditions = [
            Pet.user_id == user_id,
            Pet.species == species,
            Pet.nickname == nickname,
        ]
        if exclude_id is not None:
            conditions.append(Pet.id != exclude_id)
        result = await self.db.execute(select(Pet).where(and_(*conditions)))
        return result.scalar_one_or_none() is not None

    async def _validate_breed_species(self, breed_id: int, species: str) -> None:
        result = await self.db.execute(
            select(PetBreed).where(PetBreed.id == breed_id)
        )
        breed = result.scalar_one_or_none()
        if not breed:
            raise ValueError("品种不存在")
        if breed.species != species:
            raise ValueError("品种与宠物种类不匹配")

    async def _invalidate_suggested_questions_cache(self, user_id: int) -> None:
        try:
            from app.services.suggested_questions import invalidate_cache
            await invalidate_cache(user_id)
        except ImportError:
            pass
        except Exception:
            logger.debug(f"Failed to invalidate suggested questions cache for user {user_id}")
