# Data Model: AI助手能力优化与长期记忆

**Feature**: 010-ai-assistant-optimization | **Date**: 2026-06-17

## Entity Changes

### 1. AssistantMemory (`assistant_memories`) — NEW

Current effective long-term memory for one mini-program user. This is the only user-visible memory state; no user-facing history table is required.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | Integer PK | yes | Primary key. |
| `user_id` | Integer FK -> `users.id` | yes | One memory record per user. |
| `enabled` | Boolean | yes | Default true for logged-in users. False means Dream extraction is paused and chat should not use the memory. |
| `pet_status` | Text | no | Classified memory about pets, age/stage, known symptoms or stable conditions. |
| `preferences_budget` | Text | no | Product preferences, budget constraints, brands/types to prefer or avoid. |
| `common_questions` | Text | no | Recurring question themes and assistant-use patterns. |
| `cautions` | Text | no | Allergies, intolerance, soft stool triggers, safety notes and explicit user corrections. |
| `summary` | Text | no | Combined display/prompt summary generated from the four sections; must be <= 500 Chinese characters. |
| `last_extracted_message_id` | Integer nullable | no | Highest `chat_messages.id` included by Dream extraction. Used to process only new messages. |
| `last_extracted_at` | DateTime nullable | no | Last successful Dream extraction time. |
| `last_user_edited_at` | DateTime nullable | no | Last manual edit/clear/pause time. |
| `created_at` / `updated_at` | DateTime | yes | Creation and latest effective update timestamps. |

**Validation Rules**:
- `user_id` must be unique.
- `summary` must be <= 500 characters before saving or returning to the mini-program.
- The four section fields should each be concise; implementation should reject or compress content that would make `summary` exceed 500 characters.
- `enabled=false` keeps the current content available for user viewing/editing but prevents Dream extraction and prompt injection.
- Clearing memory sets all section fields and `summary` to empty while preserving the row and `enabled` choice.
- Manual edits take precedence over automatic extraction. A Dream merge must not silently overwrite newer user-edited content.

**Recommended Indexes / Constraints**:

```sql
CREATE UNIQUE INDEX uq_assistant_memories_user_id ON assistant_memories (user_id);
CREATE INDEX ix_assistant_memories_enabled ON assistant_memories (enabled);
CHECK (char_length(coalesce(summary, '')) <= 500);
```

### 2. ChatMessage (`chat_messages`) — MODIFY BEHAVIOR / OPTIONAL ADDITIVE FIELD

Existing chat message records remain the source for Dream extraction.

| Field | Change | Description |
|-------|--------|-------------|
| `referenced_spus` | existing behavior extended | Continue storing referenced SPU IDs from tool/card outputs. |
| `tool_calls` | existing behavior extended | Store tool/card-producing calls when available for later evaluation. |
| `memory_extracted_at` | optional additive DateTime | May be added if per-message extraction marking is preferred over `last_extracted_message_id`. |

**Rules**:
- Dream extraction should only consider logged-in users' messages.
- Use `AssistantMemory.last_extracted_message_id` as the primary simple marker for v1 unless implementation proves per-message marking is needed.
- Do not delete existing chat sessions or messages as part of this feature.

### 3. ProductAnswerCard — RESPONSE MODEL

Structured cards emitted by chat stream and rendered by the mini-program. This is a response contract rather than a persisted table.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `card_id` | String | yes | Stable ID within one assistant response. |
| `card_type` | Enum | yes | `spu`, `comparison`, `recommendation_list`, `ingredient_insight`, `follow_up`, `food_transition_plan`. |
| `title` | String | yes | Short card title. |
| `payload` | Object | yes | Type-specific data. |
| `source` | String | no | Tool or capability that produced the card. |

**Card Types**:

| Type | Purpose | Minimum Payload |
|------|---------|-----------------|
| `spu` | Optimized single product card | `spu_id`, `brand`, `name`, `pet_type`, `category`, `price_range`, `pros`, `cautions`, `detail_url` |
| `comparison` | Compare two or more products | `items[]`, `dimensions[]`, `recommendation` |
| `recommendation_list` | Multi-product recommendation | `items[]`, `ranking_reason`, `filters_applied` |
| `ingredient_insight` | Explain ingredient/nutrition point | `subject`, `meaning`, `benefits`, `cautions`, `suitable_for` |
| `follow_up` | Ask for missing constraints | `questions[]`, `reason` |
| `food_transition_plan` | New capability output | `phases[]`, `observe[]`, `stop_conditions[]`, `vet_disclaimer` |

### 4. AssistantCapability — DOCUMENTED CONFIG / EVAL RECORD

Represents a candidate or launched AI capability. For v1 this can be a typed in-code registry plus evaluation fixtures; persistence is optional unless later admin management is required.

| Field | Description |
|-------|-------------|
| `key` | Stable capability key, e.g. `food_transition_plan`. |
| `status` | `candidate`, `launched`, `deferred`. |
| `trigger_examples` | User utterances that should trigger the capability. |
| `required_inputs` | Inputs required before generating structured output. |
| `fallback` | Follow-up or refusal behavior when inputs/data are missing. |
| `risk_notes` | Safety and reliability constraints. |

**V1 Required Capability**:
- `food_transition_plan` must be `launched`.
- At least one other candidate must be evaluated and recorded in research/tasks/eval fixtures.

### 5. User (`users`) — UNCHANGED RELATIONSHIP

Existing users are linked one-to-one to `AssistantMemory`. Authentication remains the gate for memory generation, viewing and editing.

### 6. SPU (`spus`) — READ-ONLY INPUT

Existing SPU data feeds cards and tools. This feature does not require SPU schema changes.

## State Transitions

```text
AssistantMemory lifecycle:
no row -> first logged-in access creates enabled current memory row
enabled -> paused (user pauses recording)
paused -> enabled (user resumes recording)
enabled/paused -> cleared (user clears sections and summary)
enabled -> auto-updated (daily Dream extraction merges new useful info)
enabled/paused -> user-edited (manual sections replace current effective content)
```

```text
Dream extraction:
scheduled -> load users with new messages -> extract useful facts
          -> no useful facts (memory unchanged)
          -> merge facts (validate <=500 chars, save current memory)
          -> failed (log error, memory unchanged)
```

## Query Patterns

### Get current memory

```sql
SELECT *
FROM assistant_memories
WHERE user_id = :current_user_id
LIMIT 1;
```

### Find users needing daily extraction

```sql
SELECT cs.user_id, max(cm.id) AS latest_message_id
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
LEFT JOIN assistant_memories am ON am.user_id = cs.user_id
WHERE cs.user_id IS NOT NULL
  AND coalesce(am.enabled, true) = true
  AND cm.id > coalesce(am.last_extracted_message_id, 0)
GROUP BY cs.user_id;
```

### Load recent new messages for one user

```sql
SELECT cm.*
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cs.user_id = :user_id
  AND cm.id > :last_extracted_message_id
ORDER BY cm.id ASC
LIMIT :max_messages_per_batch;
```

## Migration Notes

- Do not delete tables.
- Add `assistant_memories` as a new table with a unique user constraint.
- Optional `memory_extracted_at` on `chat_messages` must be additive and nullable if chosen.
- Backfill is not required; memory can be created lazily for logged-in users or at first Dream run.
