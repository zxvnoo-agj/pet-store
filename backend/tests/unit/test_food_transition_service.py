from app.services.food_transition_service import FoodTransitionService


def test_food_transition_generates_phased_plan_for_complete_inputs():
    plan = FoodTransitionService().generate_plan(
        old_food="旧幼猫粮",
        new_food="新幼猫粮",
        gut_status="便便正常，食欲稳定",
        pet_type="cat",
        age_stage="幼猫",
        days=7,
    )

    assert plan["status"] == "ready"
    assert plan["title"] == "7天换粮计划"
    assert plan["phases"][0]["old_food_ratio"] == 75
    assert plan["phases"][-1]["new_food_ratio"] == 100
    assert plan["stop_conditions"]
    assert "兽医" in plan["vet_disclaimer"]


def test_food_transition_uses_slower_plan_for_sensitive_gut():
    plan = FoodTransitionService().generate_plan(
        old_food="旧粮",
        new_food="新粮",
        gut_status="最近容易软便",
    )

    assert plan["status"] == "ready"
    assert plan["title"] == "10天换粮计划"
    assert plan["phases"][0]["new_food_ratio"] == 20


def test_food_transition_returns_follow_up_for_missing_inputs():
    result = FoodTransitionService().generate_plan(
        old_food="旧粮",
        new_food=None,
        gut_status="不知道",
    )

    assert result["status"] == "needs_input"
    assert len(result["questions"]) == 2
    assert any("新粮" in question for question in result["questions"])
    assert any("便便" in question for question in result["questions"])
