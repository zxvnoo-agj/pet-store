from types import SimpleNamespace

from app.agents.tools import AgentTools


def test_normalize_pet_type_from_aliases():
    tools = AgentTools()

    assert tools._normalize_pet_type("猫咪") == "cat"
    assert tools._normalize_pet_type(None, "幼犬粮") == "dog"
    assert tools._normalize_pet_type("CAT") == "cat"


def test_spu_payload_contains_confidence_friendly_fields():
    tools = AgentTools()
    spu = SimpleNamespace(
        id=1,
        name="幼猫粮",
        brand="Test",
        model="1.5kg",
        pet_type="cat",
        category=SimpleNamespace(name="猫粮"),
        price_min=None,
        price_max=None,
        currency="CNY",
        description="",
        pros=["清晰配方"],
        cons=[],
        ingredients=["鸡肉"],
        nutrition={"protein": "36%"},
        image_urls=[],
        review_count=3,
        avg_rating=4.5,
    )

    payload = tools._spu_payload(spu)

    assert payload["category"] == "猫粮"
    assert payload["pet_type"] == "cat"
    assert payload["nutrition"] == {"protein": "36%"}
    assert payload["review_count"] == 3
    assert payload["data_notes"] == ["当前暂无价格数据"]
