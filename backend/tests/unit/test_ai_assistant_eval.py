import json
from pathlib import Path


def test_prompt_eval_fixture_covers_required_scenarios():
    fixture_path = Path(__file__).resolve().parents[1] / "fixtures" / "ai_assistant_prompts.json"
    cases = json.loads(fixture_path.read_text(encoding="utf-8"))
    case_ids = {case["id"] for case in cases}

    assert {"kitten_food", "budget_filter", "ingredient_concern", "compare_products", "health_risk"} <= case_ids
    assert all(case["prompt"] and case["expected"] for case in cases)
