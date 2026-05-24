import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pet import Pet
from app.models.pet_breed import PetBreed
from app.schemas.pet import PetCreate, PetUpdate
from app.services.pet_service import PetService


@pytest.mark.asyncio
async def test_create_pet(db_session: AsyncSession):
    service = PetService(db_session)
    pet = await service.create_pet(1, PetCreate(species="cat", nickname="团子"))
    assert pet.id is not None
    assert pet.species == "cat"
    assert pet.nickname == "团子"
    assert pet.user_id == 1


@pytest.mark.asyncio
async def test_create_pet_duplicate(db_session: AsyncSession):
    service = PetService(db_session)
    await service.create_pet(1, PetCreate(species="cat", nickname="团子"))
    with pytest.raises(ValueError, match="已存在同名宠物"):
        await service.create_pet(1, PetCreate(species="cat", nickname="团子"))


@pytest.mark.asyncio
async def test_create_pet_max_five(db_session: AsyncSession):
    service = PetService(db_session)
    for i in range(5):
        await service.create_pet(1, PetCreate(species="cat", nickname=f"cat{i}"))
    with pytest.raises(ValueError, match="最多添加5只宠物"):
        await service.create_pet(1, PetCreate(species="cat", nickname="extra"))


@pytest.mark.asyncio
async def test_list_user_pets(db_session: AsyncSession):
    service = PetService(db_session)
    await service.create_pet(1, PetCreate(species="cat", nickname="喵喵"))
    await service.create_pet(1, PetCreate(species="dog", nickname="汪汪"))
    pets = await service.list_user_pets(1)
    assert len(pets) == 2


@pytest.mark.asyncio
async def test_update_pet(db_session: AsyncSession):
    service = PetService(db_session)
    pet = await service.create_pet(1, PetCreate(species="cat", nickname="团子"))
    updated = await service.update_pet(pet.id, 1, PetUpdate(nickname="新团子"))
    assert updated.nickname == "新团子"


@pytest.mark.asyncio
async def test_update_pet_not_found(db_session: AsyncSession):
    service = PetService(db_session)
    with pytest.raises(ValueError, match="宠物不存在"):
        await service.update_pet(999, 1, PetUpdate(nickname="test"))


@pytest.mark.asyncio
async def test_delete_pet(db_session: AsyncSession):
    service = PetService(db_session)
    pet = await service.create_pet(1, PetCreate(species="cat", nickname="团子"))
    deleted = await service.delete_pet(pet.id, 1)
    assert deleted is True
    remaining = await service.list_user_pets(1)
    assert len(remaining) == 0


@pytest.mark.asyncio
async def test_delete_pet_not_found(db_session: AsyncSession):
    service = PetService(db_session)
    result = await service.delete_pet(999, 1)
    assert result is False


@pytest.mark.asyncio
async def test_get_breeds(db_session: AsyncSession):
    breeds = [
        PetBreed(species="cat", name="英短", sort_order=1),
        PetBreed(species="cat", name="布偶", sort_order=2),
        PetBreed(species="dog", name="金毛", sort_order=1),
    ]
    for b in breeds:
        db_session.add(b)
    await db_session.commit()

    service = PetService(db_session)
    cat_breeds = await service.get_breeds("cat")
    assert len(cat_breeds) == 2
    assert cat_breeds[0].name == "英短"

    dog_breeds = await service.get_breeds("dog")
    assert len(dog_breeds) == 1
    assert dog_breeds[0].name == "金毛"


@pytest.mark.asyncio
async def test_get_last_selected_pet_id(db_session: AsyncSession):
    from app.models.user import User
    user = User(id=1, nickname="test", openid="test_openid", profile={})
    db_session.add(user)
    await db_session.commit()

    service = PetService(db_session)
    result = await service.get_last_selected_pet_id(1)
    assert result is None
