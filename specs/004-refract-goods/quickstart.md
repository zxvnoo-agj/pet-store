# Quick Start Guide: Goods Module SPU Refactor

**Feature**: 004-refract-goods  
**Date**: 2026-05-20  
**Prerequisites**: Feature 001-003 deployed and running

## 1. Environment Setup

### Database Migration

Run Alembic migration to create new tables:

```bash
cd backend
alembic upgrade head
```

This creates:
- `spus` — canonical product definitions
- `spu_listings` — e-commerce listings linked to SPUs

### Verify Migration

```bash
# Connect to PostgreSQL and verify tables exist
psql $DATABASE_URL -c "\dt spus"
psql $DATABASE_URL -c "\dt spu_listings"
```

---

## 2. Admin Setup

### Access SPU Management

1. Log in to admin panel: `http://localhost:5173`
2. Navigate to **Goods > SPU Management** (new menu item)
3. SPU list page shows aggregated product catalog

### Create First SPU

1. Click **"Create SPU"** button
2. Fill required fields:
   - **Brand**: e.g., "Royal Canin"
   - **Category**: Select from dropdown (links to existing categories)
   - **Product Name**: e.g., "Indoor Adult Cat Food"
   - **Model**: e.g., "K36 2kg"
   - **Pet Type**: cat / dog
3. Fill optional detailed attributes:
   - **Ingredients**: List of main ingredients
   - **Nutrition**: Protein, fat, fiber percentages
   - **Pros/Cons**: Key advantages and disadvantages
   - **Extra Attributes**: Category-specific fields (JSON key-value)
4. Upload product images
5. Click **Save**

### Import Listings

1. Go to **Goods > Listing Import**
2. Select source: "PDD DDK"
3. Enter search keyword: e.g., "cat food"
4. Set max results: 100
5. Click **Start Import**
6. System will:
   - Fetch listings from DDK API
   - Run automatic semantic matching
   - Classify into high/medium/low confidence tiers
   - High confidence (≥85%) listings are auto-linked
   - Medium confidence (60-84%) appear in review queue

---

## 3. Review Queue Workflow

### Access Review Queue

1. Navigate to **Goods > Matching Queue**
2. Two tabs:
   - **Candidate Matches** (60-84% confidence): Shows suggested SPU for each listing
   - **Unmatched** (<60% confidence): Listings with no clear match

### Process Candidate Matches

For each candidate listing:
- Review the **suggested SPU** (brand, name, model)
- Click **✓ Confirm** if correct → listing is linked immediately
- Click **✗ Reject** if incorrect → listing moves to unmatched

**Bulk Actions**:
- Select multiple listings via checkboxes
- Click **"Confirm Selected"** or **"Reject Selected"**

### Process Unmatched Listings

For each unmatched listing:
1. Review listing title and details
2. Choose action:
   - **"Link to Existing SPU"**: Search and select correct SPU
   - **"Create New SPU"**: Opens SPU creation form pre-filled with listing data
   - **"Skip"**: Leave in queue for later

---

## 4. Viewing Aggregated Data

### SPU List Page

- Shows one card per SPU (not per listing)
- Each card displays:
  - Product image
  - Brand + Name + Model
  - Price range: ¥89 - ¥156
  - Number of linked listings: "12 shops"
- Filters: Brand, Category, Pet Type, Search

### SPU Detail Page

Click any SPU card to open detail view:

**Tab 1 — Basic Info**:
- Editable form with all SPU attributes
- Ingredients, nutrition, pros/cons in structured format

**Tab 2 — Listings**:
- Table of all linked e-commerce listings
- Columns: Shop, Platform, Price, URL, Last Updated
- Sortable by price

**Tab 3 — History**:
- Audit log of matching decisions
- Who linked/unlinked listings and when

---

## 5. API Quick Reference

### Key Endpoints

```bash
# List SPUs
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8001/v1/admin/goods/spus?page=1&brand=Royal+Canin"

# Create SPU
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 3,
    "brand": "Royal Canin",
    "name": "Indoor Adult Cat Food",
    "model": "K36 2kg",
    "pet_type": "cat",
    "ingredients": ["Chicken", "Rice"],
    "nutrition": {"protein": "32%", "fat": "15%"}
  }' \
  http://localhost:8001/v1/admin/goods/spus

# Get matching queue
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8001/v1/admin/goods/matching-queue?tier=candidate"

# Confirm match
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listing_ids": [301, 302]}' \
  http://localhost:8001/v1/admin/goods/matching-queue/confirm
```

---

## 6. Testing Checklist

### Basic Functionality

- [ ] Create SPU with all required fields
- [ ] Create SPU with duplicate identity (should fail with 409)
- [ ] Edit SPU detailed attributes
- [ ] Delete SPU (and verify listings are cascade-deleted)

### Listing Management

- [ ] Import listings from DDK API
- [ ] Verify auto-matching classifies listings into tiers
- [ ] Confirm candidate match moves listing to linked
- [ ] Reject candidate match marks listing as rejected
- [ ] Manually link unmatched listing to existing SPU

### Price Aggregation

- [ ] Link multiple listings with different prices to same SPU
- [ ] Verify SPU shows correct min-max price range
- [ ] Update a listing price and verify SPU range recalculates
- [ ] Unlink a listing and verify SPU range updates

### Edge Cases

- [ ] Create SPU with model = "default" (handles no-model case)
- [ ] Import listing with same (platform, goods_id) as existing (should update, not duplicate)
- [ ] Test search/filter on SPU list page
- [ ] Verify pagination on SPU list and listings

---

## 7. Troubleshooting

### Migration Issues

**Problem**: `spus` table already exists
```bash
# Check if migration was partially applied
alembic current
# If stuck, stamp and retry
alembic stamp head
alembic upgrade head
```

### Matching Not Working

**Problem**: No listings are auto-linked
- Verify DDK API credentials are configured
- Check `spu_listings` table for imported records
- Review application logs for matching errors
- Ensure at least one SPU exists in database

### Price Range Not Updating

**Problem**: SPU shows null prices after linking listings
- Verify listings have `match_status = 'linked'`
- Check if listing prices are non-null
- Trigger manual recalculation via API or restart service

---

## 8. Next Steps

After basic setup:
1. **Seed SPUs**: Convert high-quality existing products to SPUs
2. **Import Historical Data**: Bulk import past DDK search results
3. **Tune Matching**: Review matching accuracy and adjust confidence thresholds if needed
4. **Monitor Queue**: Keep review queue empty for best data quality
