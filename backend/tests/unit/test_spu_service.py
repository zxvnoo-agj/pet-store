import pytest
from unittest.mock import AsyncMock, MagicMock

from app.schemas.spu import SpuCreate
from app.services.spu_service import SpuService


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    return db


@pytest.fixture
def spu_service(mock_db):
    return SpuService(mock_db)


@pytest.fixture
def sample_spu_create():
    return SpuCreate(
        category_id=1,
        brand="Royal Canin",
        name="Indoor Adult Cat Food",
        model="K36 2kg",
        pet_type="cat",
        description="Premium cat food for indoor cats",
        ingredients=["Chicken", "Rice"],
        nutrition={"protein": "32%"},
        pros=["High protein"],
        cons=["Pricey"],
        extra_attrs={"origin": "France"},
        image_urls=["https://example.com/image.jpg"],
        status="active",
    )


@pytest.mark.asyncio
async def test_create_spu_success(spu_service, mock_db, sample_spu_create):
    mock_db.execute.return_value.scalar_one_or_none.return_value = None
    mock_db.execute.return_value.scalars.return_value.all.return_value = []

    spu = MagicMock()
    spu.id = 1
    spu.brand = sample_spu_create.brand
    spu.name = sample_spu_create.name
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    result = await spu_service.create_spu(sample_spu_create)

    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_create_spu_duplicate(spu_service, mock_db, sample_spu_create):
    existing = MagicMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = existing

    with pytest.raises(ValueError, match="already exists"):
        await spu_service.create_spu(sample_spu_create)
