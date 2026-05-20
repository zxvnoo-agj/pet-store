import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.spu_matching_service import MatchingResult, SpuMatchingService


@pytest.fixture
def mock_spu():
    spu = MagicMock()
    spu.id = 1
    spu.brand = "Royal Canin"
    spu.name = "Indoor Adult Cat Food"
    spu.model = "K36 2kg"
    spu.pet_type = "cat"
    spu.category = MagicMock()
    spu.category.name = "Dry Cat Food"
    return spu


@pytest.fixture
def mock_spu2():
    spu = MagicMock()
    spu.id = 2
    spu.brand = "Hill's"
    spu.name = "Science Diet Adult"
    spu.model = "7kg"
    spu.pet_type = "dog"
    spu.category = MagicMock()
    spu.category.name = "Dry Dog Food"
    return spu


class TestSpuMatchingService:
    @pytest.mark.asyncio
    async def test_match_listing_to_spu_high_confidence(self, mock_spu):
        service = SpuMatchingService()

        # Mock LLM response for high confidence match
        mock_response = MagicMock()
        mock_response.content = '{"spu_id": 1, "confidence": 0.92, "reason": "Exact brand and model match"}'

        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        service.llm = mock_llm

        result = await service.match_listing_to_spu(
            listing_title="Royal Canin K36 Indoor Cat Food 2kg Official Store",
            spus=[mock_spu],
        )

        assert result.spu_id == 1
        assert result.confidence == 0.92
        assert "match" in result.reason.lower()

    @pytest.mark.asyncio
    async def test_match_listing_to_spu_medium_confidence(self, mock_spu, mock_spu2):
        service = SpuMatchingService()

        mock_response = MagicMock()
        mock_response.content = '{"spu_id": 1, "confidence": 0.72, "reason": "Brand matches but model unclear"}'

        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        service.llm = mock_llm

        result = await service.match_listing_to_spu(
            listing_title="Royal Canin Cat Food Indoor Formula",
            spus=[mock_spu, mock_spu2],
        )

        assert result.spu_id == 1
        assert 0.60 <= result.confidence <= 0.84

    @pytest.mark.asyncio
    async def test_match_listing_to_spu_low_confidence(self, mock_spu, mock_spu2):
        service = SpuMatchingService()

        mock_response = MagicMock()
        mock_response.content = '{"spu_id": 0, "confidence": 0.35, "reason": "Unknown brand"}'

        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        service.llm = mock_llm

        result = await service.match_listing_to_spu(
            listing_title="Unknown Brand Special Offer Cat Food",
            spus=[mock_spu, mock_spu2],
        )

        assert result.confidence < 0.60

    @pytest.mark.asyncio
    async def test_match_listing_to_spu_no_spus(self):
        service = SpuMatchingService()

        result = await service.match_listing_to_spu(
            listing_title="Some cat food",
            spus=[],
        )

        assert result.spu_id == 0
        assert result.confidence == 0.0

    @pytest.mark.asyncio
    async def test_match_listing_to_spu_invalid_spu_id(self, mock_spu):
        service = SpuMatchingService()

        mock_response = MagicMock()
        mock_response.content = '{"spu_id": 999, "confidence": 0.95, "reason": "Match"}'

        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        service.llm = mock_llm

        result = await service.match_listing_to_spu(
            listing_title="Royal Canin K36",
            spus=[mock_spu],
        )

        # Should penalize confidence when SPU not found
        assert result.confidence < 0.95

    def test_parse_matching_response_valid(self):
        service = SpuMatchingService()
        content = '{"spu_id": 1, "confidence": 0.85, "reason": "Exact match"}'

        result = service._parse_matching_response(content)

        assert result.spu_id == 1
        assert result.confidence == 0.85
        assert result.reason == "Exact match"

    def test_parse_matching_response_invalid_json(self):
        service = SpuMatchingService()
        content = "not json"

        result = service._parse_matching_response(content)

        assert result.spu_id == 0
        assert result.confidence == 0.0

    def test_build_matching_prompt(self, mock_spu):
        service = SpuMatchingService()
        spu_descriptions = [
            f"SPU {mock_spu.id}: {mock_spu.brand} {mock_spu.name} {mock_spu.model} "
            f"(Category: {mock_spu.category.name}, Pet: {mock_spu.pet_type})"
        ]

        prompt = service._build_matching_prompt("Test title", spu_descriptions)

        assert "Test title" in prompt
        assert "Royal Canin" in prompt
        assert "SPU 1" in prompt
        assert "0.85-1.0" in prompt
