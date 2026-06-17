# Research: AI助手能力优化与长期记忆

**Feature**: 010-ai-assistant-optimization | **Date**: 2026-06-17

## Decision 1: Store current user memory as a dedicated current-state entity

**Decision**: Add a user-level assistant memory entity that stores only the current effective classified memory, enabled/paused state and latest timestamps.

**Rationale**: The feature requires user-visible memory to be 500 characters or less, editable, clearable and not historical. A dedicated entity keeps this behavior explicit, avoids overloading `users.profile`, and allows indexes, validation and future privacy handling without touching unrelated user profile fields.

**Alternatives considered**:
- Store memory inside `users.profile`: rejected because it mixes AI-derived editable state with general user profile data and makes pause/clear timestamps harder to validate.
- Store every memory update as an append-only history: rejected because the clarified requirement says only current effective memory and latest update time should be visible/retained for the product experience.
- Store memory per chat session: rejected because the feature requires long-term user-level memory across conversations.

## Decision 2: Run Dream memory extraction as a daily APScheduler batch

**Decision**: Register a daily Dream job in the existing backend scheduler to process logged-in users with new chat messages since their last memory extraction.

**Rationale**: The clarified update target is 24 hours. Daily batch processing reduces repeated LLM calls, avoids adding latency to chat streaming, and fits the existing `backend/app/scheduler/jobs.py` pattern.

**Alternatives considered**:
- Run after every chat session: rejected because it adds cost and can update memory from half-finished conversations.
- Trigger only when the AI impression page opens: rejected because users expect the memory to already reflect recent conversations.
- Trigger after a fixed message count: rejected for v1 because the 24-hour requirement is clearer to test and operate.

## Decision 3: Use classified memory sections with a 500-character display summary

**Decision**: Represent memory in four sections: `pet_status`, `preferences_budget`, `common_questions`, and `cautions`, then validate the combined display content stays within 500 Chinese characters.

**Rationale**: Classified sections match the clarified UX and reduce accidental mixing of pet symptoms, product preferences and common questions. The sections are still small enough to fit mini-program editing without creating complex record management.

**Alternatives considered**:
- Single text blob: rejected because it is harder for users to correct one wrong item without rewriting the whole memory.
- Arbitrary user-created categories: rejected for v1 because it complicates validation and prompt injection.
- Full structured pet profile replacement: rejected because existing pet profiles remain the source of canonical pet facts; memory should capture assistant-relevant impressions only.

## Decision 4: Emit structured answer card events alongside streaming text

**Decision**: Extend chat SSE with a structured `answer_cards` event and keep existing `message`, `tool_call`, `tool_result`, `spus`, `done` events for backward compatibility.

**Rationale**: The current chat stream already emits SSE events and a final `spus` event. A dedicated card event lets the mini-program render multiple card types without parsing assistant text, while older UI behavior can continue to use `spus`.

**Alternatives considered**:
- Encode cards inside Markdown text: rejected because it is brittle on mini-program and hard to type-check.
- Replace the existing `spus` event immediately: rejected because current chat UI already expects referenced SPUs.
- Fetch cards after stream completion: rejected because it adds a second round trip and can desync from the answer.

## Decision 5: Implement "换粮计划" as the first new capability

**Decision**: Add a food transition plan capability that gathers current food, new food, pet stage and gut sensitivity, then returns phased transition guidance, observation points and stop/seek-vet warnings.

**Rationale**: It is high-frequency for pet food selection, combines product and pet knowledge, and has clear input/outputs. It can reuse pet profile and long-term memory while staying away from precise medical diagnosis or prescription.

**Alternatives considered**:
- Product substitute recommendation: valuable, but heavily depends on product coverage and matching quality.
- Feeding amount estimate: useful but riskier without reliable calorie and product serving data.
- Ingredient risk explanation: valuable and already partially covered by the card and tool improvements; it can remain a candidate after v1.

## Decision 6: Keep medical safety boundaries in prompt, tool output and card rendering

**Decision**: Health-risk, medication, emergency symptom and dosing-like responses must include clear safety boundaries and recommend veterinary help when appropriate.

**Rationale**: The AI assistant handles pet knowledge but must not become a veterinary diagnosis tool. Safety language should not rely on the LLM alone; the food transition service and card templates should also include stop conditions and escalation wording.

**Alternatives considered**:
- Trust the general system prompt only: rejected because structured capabilities and cards can bypass nuance if templates omit safety copy.
- Block all health-related questions: rejected because many valid pet-care questions are not emergency or diagnosis requests.

## Decision 7: Use additive migration only

**Decision**: Implement schema work as additive tables/columns/indexes and do not delete tables.

**Rationale**: Project instructions explicitly prohibit table deletion without user approval. The feature can be implemented by adding an assistant memory table and optional chat processing marker fields.

**Alternatives considered**:
- Replacing existing chat tables: rejected because existing sessions/messages already serve history and persistence needs.
- Dropping legacy chat fields: rejected because this feature does not require destructive schema changes.
