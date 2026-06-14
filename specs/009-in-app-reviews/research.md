# Research: 自建用户评价功能

**Feature**: 009-in-app-reviews | **Date**: 2026-06-14

## Decision 1: Keep `reviews` as the canonical review table

**Decision**: Reuse the existing `reviews` table and formalize its `source` and `status` values instead of introducing a new user-review table.

**Rationale**: The current model already has `spu_id`, `user_id`, `rating`, `content`, `source`, `status`, `is_recommended`, `source_url`, and AI analysis fields. A single table keeps mini-program listing, admin moderation, and summary aggregation consistent across user, XHS and admin-seeded data.

**Alternatives considered**:
- Separate `user_reviews` table: rejected because it would duplicate rating/content/status logic and complicate unified "真实评价" display.
- Keep XHS-only query path: rejected because 009 requires all approved sources to appear in one review list.

## Decision 2: Source enum with four product-facing sources

**Decision**: Standardize source values as `user`, `xhs_manual`, `xhs_auto`, and `admin_seed`.

**Rationale**: These values directly reflect the requested trust model: self-built user reviews, manually imported XHS cold-start material, automatic XHS collection when available, and operations-curated content. The existing 008 code that writes `source="crawled"` should be migrated to `xhs_auto`.

**Alternatives considered**:
- Keep `crawled`: rejected because it is ambiguous and does not distinguish XHS manual vs auto.
- Use display labels in database: rejected because stable internal enum values are easier to validate and localize.

## Decision 3: Pending self-visible card after submission

**Decision**: User-submitted reviews are stored as `pending`; normal review list returns approved reviews plus the current user's own pending/rejected review metadata when authenticated.

**Rationale**: This satisfies moderation requirements without making unapproved content visible to everyone. It also gives immediate feedback after submission, reducing uncertainty.

**Alternatives considered**:
- Optimistic public display: rejected because moderation is required.
- Redirect to a separate "my reviews" page only: rejected because the acceptance criteria says the user sees an in-list "审核中" placeholder.

## Decision 4: Local sensitive-word matcher for v1

**Decision**: Implement a local Chinese sensitive-word list and deterministic keyword matching in backend validation.

**Rationale**: The user explicitly chose a self-built simple word list. It avoids external API dependency, keeps submission latency low, and is easy to test. This is a first-pass content safety gate; admin moderation remains the final gate.

**Alternatives considered**:
- LLM moderation: rejected for latency/cost and because the feature asked for local keyword matching.
- Third-party moderation API: rejected because it introduces vendor setup and policy coupling outside v1 scope.

## Decision 5: Add reject reason as review metadata

**Decision**: Store admin rejection reason on the review record, either as a nullable `reject_reason` column or inside an explicit moderation metadata JSON field.

**Rationale**: FR-016 requires rejection reason to be archived. A nullable column is simpler for filtering/exporting; metadata JSON is more flexible. The implementation tasks should choose the least invasive option based on existing migration patterns.

**Alternatives considered**:
- Store reason only in logs: rejected because logs are not a durable business record.
- Notify users immediately: rejected because notification is out of scope for this version.

## Decision 6: Summary generation should use all approved sources

**Decision**: Update AI summary aggregation to select all `status="approved"` reviews for the SPU, not only XHS/crawled records or records with `external_note_id`.

**Rationale**: The product value shifts from XHS-only sentiment to a broader first-party review pool. Summary inputs should include source labels so the model can weigh context, but approved user/admin reviews should not be excluded.

**Alternatives considered**:
- Separate summaries per source: rejected for v1 because it adds UI and prompt complexity.
- User reviews only: rejected because XHS/admin_seed cold-start data remains useful.
