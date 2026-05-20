# Research Notes: Goods Module SPU Refactor

**Date**: 2026-05-20  
**Feature**: 004-refract-goods  
**Purpose**: Resolve technical unknowns and document design decisions for SPU aggregation

---

## 1. SPU Aggregation Strategy

### Decision: Two-Table Approach (SPU + Listings)

**Rationale**: Rather than modifying the existing `products` table in-place (which has 30+ columns and is used by 001/002 features), we create a new `spus` table as the canonical master data. The existing `products` table continues to serve its current purpose (discovered products from DDK search) while `spus` becomes the aggregated view. This minimizes risk to existing features.

**Alternative Considered**: Modify `products` table to add SPU fields. Rejected because:
- `products` is tightly coupled with 001/002 features (chat recommendations, favorites, reviews)
- Existing `source_url`/`source_platform` fields assume one listing per product
- Migration would require updating all existing code paths simultaneously

**Trade-off**: Requires maintaining two product-related tables, but provides clean separation of concerns:
- `products`: Raw discovered items from DDK (002 pipeline)
- `spus`: Curated canonical catalog (004 pipeline)
- Future: `products` could become a source feed for `spu` creation

---

## 2. Data Migration Strategy

### Decision: Seed SPUs from Existing Products + Manual Curation

**Approach**:
1. Create `spus` table with empty initial data
2. Provide admin UI to convert existing `products` into SPUs (one-click "Promote to SPU")
3. Admin manually fills in detailed attributes (ingredients, nutrition, pros/cons)
4. Existing `products` table remains unchanged; no automatic migration

**Rationale**: 
- Existing products have incomplete data (many are pending enrichment)
- SPU requires manual curation of detailed attributes anyway
- Automatic migration would create low-quality SPUs, defeating the purpose

---

## 3. Semantic Matching Algorithm

### Decision: LLM-Based Fuzzy Matching with Structured Output

**Approach**: Use an LLM (e.g., GPT-4o-mini or local equivalent) to compare incoming listing titles against existing SPU definitions.

**Matching Pipeline**:
1. Extract candidate SPUs: Query SPUs where brand/category overlap with listing
2. Build prompt: "Given listing title '...' and candidate SPUs [...], which SPU does this listing belong to?"
3. Parse structured output: `{ "spu_id": 123, "confidence": 0.92, "reasoning": "..." }`
4. Apply tiered thresholds: ≥85% auto-link, 60-84% candidate, <60% unmatched

**Alternative Considered**: 
- **Rule-based matching** (exact title match): Rejected — e-commerce titles vary too much
- **Embedding similarity** (cosine distance): Rejected — requires vector DB and Chinese text embeddings; LLM approach is more accurate for semantic understanding
- **Hybrid approach** (embedding pre-filter + LLM verify): Considered for v2 if performance becomes an issue

**Performance Note**: Matching is async (background task), so LLM latency (1-3s per batch) is acceptable.

---

## 4. Frontend Refactoring Approach

### Decision: Replace Product List/Detail with SPU-Centric Views

**Pages to Refactor**:
1. **Product List** (`admin/src/pages/Products/index.tsx`): 
   - Replace flat product grid with SPU cards
   - Each card shows: brand, name, model, price range, listing count
   - Click → SPU detail drawer/page

2. **New SPU Detail Page**:
   - Tab 1: Basic info + detailed attributes (editable)
   - Tab 2: Linked listings table (shop, price, URL, last updated)
   - Tab 3: Matching history / audit log

3. **New Matching Queue Page**:
   - Two sections: "Candidate Matches" (60-84%) and "Unmatched" (<60%)
   - Bulk actions: confirm match, reject, create new SPU

**State Management**: Extend existing Zustand stores with `useSpuStore`.

---

## 5. Price Aggregation Logic

### Decision: Min-Max Range with Periodic Recalculation

**Implementation**:
- Store `price_min` and `price_max` on `spus` table (materialized)
- Update on: new listing linked, existing listing price changed, listing unlinked
- Recalculate via SQL: `MIN(price) OVER linked_listings`, `MAX(price) OVER linked_listings`
- No historical price tracking for v1 (out of scope)

---

## 6. Duplicate Detection (SPU Creation)

### Decision: Uniqueness Constraint on (brand, category_id, name, model)

**Rationale**: These four fields form the SPU identity key per feature spec. If admin tries to create a duplicate, system shows warning with existing SPU link.

**Edge Case**: What if model is NULL? 
- Decision: `model` is required for SPU creation. If unknown, admin enters "default" or descriptive string.

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Table Structure | New `spus` + `spu_listings` tables | Minimize risk to existing 001/002 features |
| Migration | Manual seeding from admin UI | Existing products lack SPU-quality data |
| Matching | LLM-based fuzzy matching | Handles title variations across sellers |
| Price Display | Min-max range | Most intuitive for price comparison |
| Matching Tiers | 85%/60% thresholds | Balances automation vs accuracy |
| Duplicate Check | Unique on (brand, category, name, model) | Enforces SPU identity per spec |
