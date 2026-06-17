# API Contracts: AI助手能力优化与长期记忆

**Feature**: 010-ai-assistant-optimization | **Date**: 2026-06-17

All JSON responses follow the existing `ApiResponse` envelope:

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

## 1. Mini-program: get current AI memory

```http
GET /v1/chat/memory
Authorization: Bearer <required user token>
```

**Behavior**:
- Returns the current effective AI long-term memory for the logged-in user.
- Creates an empty enabled memory row lazily if none exists.
- Does not return historical versions.

**Response `data`**:

```json
{
  "enabled": true,
  "summary": "宠物状况：6个月布偶猫，换粮易软便。偏好预算：关注幼猫粮、肠胃友好。常问问题：猫粮选择、换粮节奏。注意事项：避免突然换粮。",
  "sections": {
    "pet_status": "6个月布偶猫，换粮易软便。",
    "preferences_budget": "关注幼猫粮、肠胃友好。",
    "common_questions": "猫粮选择、换粮节奏。",
    "cautions": "避免突然换粮。"
  },
  "character_count": 62,
  "last_updated_at": "2026-06-17T04:00:00Z",
  "last_extracted_at": "2026-06-17T04:00:00Z",
  "last_user_edited_at": null
}
```

## 2. Mini-program: update classified AI memory

```http
PUT /v1/chat/memory
Authorization: Bearer <required user token>
Content-Type: application/json
```

**Request**:

```json
{
  "sections": {
    "pet_status": "7个月布偶猫，换粮易软便。",
    "preferences_budget": "偏好肠胃友好型幼猫粮，预算每月300元以内。",
    "common_questions": "猫粮选择、换粮节奏。",
    "cautions": "突然换粮会软便。"
  }
}
```

**Validation**:
- `sections` keys are exactly `pet_status`, `preferences_budget`, `common_questions`, `cautions`.
- Each section may be empty.
- Combined `summary` must be <= 500 Chinese characters.
- User edits become the highest-priority current memory and must not be silently overwritten by Dream.

**Success Response `data`**:

```json
{
  "enabled": true,
  "summary": "宠物状况：7个月布偶猫，换粮易软便。偏好预算：偏好肠胃友好型幼猫粮，预算每月300元以内。常问问题：猫粮选择、换粮节奏。注意事项：突然换粮会软便。",
  "sections": {
    "pet_status": "7个月布偶猫，换粮易软便。",
    "preferences_budget": "偏好肠胃友好型幼猫粮，预算每月300元以内。",
    "common_questions": "猫粮选择、换粮节奏。",
    "cautions": "突然换粮会软便。"
  },
  "character_count": 83,
  "last_updated_at": "2026-06-17T10:30:00Z",
  "last_user_edited_at": "2026-06-17T10:30:00Z"
}
```

## 3. Mini-program: pause or resume memory recording

```http
PATCH /v1/chat/memory/settings
Authorization: Bearer <required user token>
Content-Type: application/json
```

**Request**:

```json
{
  "enabled": false
}
```

**Behavior**:
- `enabled=false` stops Dream extraction and prompt injection.
- Existing memory remains visible and editable unless cleared.

**Response `data`**:

```json
{
  "enabled": false,
  "last_updated_at": "2026-06-17T10:35:00Z"
}
```

## 4. Mini-program: clear AI memory

```http
DELETE /v1/chat/memory
Authorization: Bearer <required user token>
```

**Behavior**:
- Clears all sections and `summary`.
- Preserves the row and current enabled/paused setting.
- No historical version is returned or restored.

**Response `data`**:

```json
{
  "enabled": true,
  "summary": "",
  "sections": {
    "pet_status": "",
    "preferences_budget": "",
    "common_questions": "",
    "cautions": ""
  },
  "character_count": 0,
  "last_updated_at": "2026-06-17T10:40:00Z"
}
```

## 5. Chat stream: answer card event

```http
POST /v1/chat/stream
Authorization: Bearer <optional user token>
Content-Type: application/json
Accept: text/event-stream
```

**Request**:

```json
{
  "session_id": 123,
  "content": "怎么从旧粮换到新粮？",
  "context": {}
}
```

**Existing SSE events retained**:
- `message`
- `tool_call`
- `tool_result`
- `spus`
- `done`
- `error`

**New SSE event**:

```text
event: answer_cards
data: {"cards":[{"card_id":"card_1","card_type":"food_transition_plan","title":"7天换粮计划","payload":{"phases":[{"day_range":"1-2天","old_food_ratio":75,"new_food_ratio":25,"note":"观察便便和食欲"},{"day_range":"3-4天","old_food_ratio":50,"new_food_ratio":50,"note":"如软便则停留在上一阶段"},{"day_range":"5-7天","old_food_ratio":25,"new_food_ratio":75,"note":"状态稳定再完全替换"}],"observe":["食欲","呕吐","软便","精神状态"],"stop_conditions":["持续腹泻","呕吐","精神沉郁"],"vet_disclaimer":"如出现持续异常，请及时咨询兽医。"}}]}
```

## 6. Answer card payload union

### `spu`

```json
{
  "card_id": "card_spu_12",
  "card_type": "spu",
  "title": "渴望幼猫粮",
  "payload": {
    "spu_id": 12,
    "brand": "Orijen",
    "name": "幼猫粮",
    "pet_type": "cat",
    "category": "猫粮",
    "price_range": "¥120-¥168",
    "pros": ["动物蛋白来源清晰"],
    "cautions": ["换粮需循序渐进"],
    "detail_url": "/pages/product/detail?id=12"
  }
}
```

### `comparison`

```json
{
  "card_id": "card_compare_1",
  "card_type": "comparison",
  "title": "两款猫粮对比",
  "payload": {
    "items": [
      {"spu_id": 12, "brand": "Orijen", "name": "幼猫粮", "price_range": "¥120-¥168"},
      {"spu_id": 18, "brand": "Royal Canin", "name": "幼猫粮", "price_range": "¥88-¥130"}
    ],
    "dimensions": ["适用阶段", "价格", "主要优点", "注意事项"],
    "recommendation": "预算充足且能接受高肉含量可优先A；肠胃敏感可先小包装试吃。"
  }
}
```

### `recommendation_list`

```json
{
  "card_id": "card_list_1",
  "card_type": "recommendation_list",
  "title": "适合幼猫的候选猫粮",
  "payload": {
    "filters_applied": ["cat", "幼猫", "预算300以内"],
    "ranking_reason": "按适龄、评价和价格综合排序",
    "items": [
      {"spu_id": 12, "brand": "Orijen", "name": "幼猫粮", "reason": "蛋白来源清晰"},
      {"spu_id": 18, "brand": "Royal Canin", "name": "幼猫粮", "reason": "适口性反馈多"}
    ]
  }
}
```

### `ingredient_insight`

```json
{
  "card_id": "card_ing_1",
  "card_type": "ingredient_insight",
  "title": "鸡肉粉是什么",
  "payload": {
    "subject": "鸡肉粉",
    "meaning": "脱水研磨后的动物蛋白原料。",
    "benefits": ["蛋白密度较高", "便于控制配方稳定性"],
    "cautions": ["关注原料标注清晰度", "过敏宠物需谨慎"],
    "suitable_for": "无鸡肉过敏史的猫狗"
  }
}
```

### `follow_up`

```json
{
  "card_id": "card_follow_1",
  "card_type": "follow_up",
  "title": "还需要几个条件",
  "payload": {
    "reason": "缺少宠物阶段和预算，无法可靠推荐。",
    "questions": ["宠物多大了？", "预算大概是多少？", "有没有软便或过敏史？"]
  }
}
```

## 7. Optional admin/internal: run Dream once

```http
POST /v1/admin/chat/memory/dream/run
Authorization: Bearer <admin token>
Content-Type: application/json
```

**Request**:

```json
{
  "user_id": 88,
  "dry_run": true
}
```

**Behavior**:
- Optional for operations and testing.
- `dry_run=true` returns proposed memory without saving.
- Must not expose full chat history in response.

**Response `data`**:

```json
{
  "user_id": 88,
  "dry_run": true,
  "proposed_sections": {
    "pet_status": "6个月布偶猫，换粮易软便。",
    "preferences_budget": "关注幼猫粮。",
    "common_questions": "猫粮选择、换粮计划。",
    "cautions": "避免突然换粮。"
  },
  "character_count": 48
}
```
