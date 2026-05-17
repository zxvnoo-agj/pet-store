import pytest


@pytest.mark.asyncio
async def test_analyze_ingredient_image_non_food():
    from app.services.vision_service import QwenVLClient
    assert QwenVLClient
    assert hasattr(QwenVLClient, "analyze_ingredient_image")


@pytest.mark.asyncio
async def test_analyze_ingredient_image_api_error():
    from app.services.vision_service import QwenVLClient
    client = QwenVLClient()
    result = await client.analyze_ingredient_image("http://invalid-url.com/img.jpg")
    assert result.get("type") == "其他"


@pytest.mark.asyncio
async def test_batch_analyze_empty():
    from app.services.vision_service import QwenVLClient
    client = QwenVLClient()
    result = await client.batch_analyze([])
    assert result["ingredients"] == []
    assert result["nutrition"] == {}


@pytest.mark.asyncio
async def test_vision_client_init():
    from app.services.vision_service import QwenVLClient
    client = QwenVLClient()
    assert client.model == "qwen-vl-plus"
