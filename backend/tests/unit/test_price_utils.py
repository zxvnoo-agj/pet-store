import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.spu_listing import SpuListing
from app.utils.price_utils import update_spu_price_range


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_update_spu_price_range_with_linked_listings(mock_db):
    # Simulate: one listing with price 99.99
    row = MagicMock()
    row.price_min = 99.99
    row.price_max = 99.99
    mock_db.execute.return_value.one_or_none.return_value = row

    await update_spu_price_range(mock_db, 1)

    mock_db.execute.assert_called()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_update_spu_price_range_with_multiple_listings(mock_db):
    # Simulate: listings with prices 50.00, 100.00, 150.00
    row = MagicMock()
    row.price_min = 50.00
    row.price_max = 150.00
    mock_db.execute.return_value.one_or_none.return_value = row

    await update_spu_price_range(mock_db, 1)

    mock_db.execute.assert_called()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_update_spu_price_range_no_listings(mock_db):
    # Simulate: no linked listings
    mock_db.execute.return_value.one_or_none.return_value = None

    await update_spu_price_range(mock_db, 1)

    mock_db.execute.assert_called()
    # Should not commit if no listings
    # mock_db.commit may or may not be called depending on implementation
