# Quick Start Guide: SPU 体系迁移

**Feature**: 005-spu-migration  
**Date**: 2026-05-21  
**Prerequisites**: Feature 004 deployed and running (spus + spu_listings tables exist)

## 1. Environment Setup

### Database Migration

Run Alembic migration to modify tables and drop products:

```bash
cd backend
alembic upgrade head
```

This performs:
1. `favorites.product_id` → `favorites.spu_id` (rename + update FK)
2. `reviews.product_id` → `reviews.spu_id` (rename + update FK)
3. `chat_messages.referenced_products` → `chat_messages.referenced_spus` (rename)
4. `DROP TABLE products` (cascade)

### Verify Migration

```bash
# Verify tables modified correctly
psql $DATABASE_URL -c "\d favorites"
psql $DATABASE_URL -c "\d reviews"
psql $DATABASE_URL -c "\d chat_messages"

# Verify products table removed
psql $DATABASE_URL -c "\dt products"  # Should return "Did not find any relation"

# Verify SPU data intact
psql $DATABASE_URL -c "SELECT COUNT(*) FROM spus;"  # Should return 33
```

---

## 2. Backend Setup

### Remove Product Code

Delete the following files (no longer needed):

```bash
# Models
rm backend/app/models/product.py

# Schemas
rm backend/app/schemas/product.py

# Services
rm backend/app/services/product_service.py

# API routes (will be replaced by spus.py)
rm backend/app/api/v1/products.py
```

### Update Imports

Update files that reference `Product` model or `ProductService`:

```bash
# Find all references
grep -r "ProductService" backend/app/ --include="*.py"
grep -r "from app.models.product" backend/app/ --include="*.py"
grep -r "from app.schemas.product" backend/app/ --include="*.py"
```

Key files to update:
- `backend/app/models/__init__.py` — Remove Product export
- `backend/app/schemas/__init__.py` — Remove Product schemas export
- `backend/app/services/__init__.py` — Remove ProductService export
- `backend/app/api/v1/__init__.py` — Replace products router with spus router
- `backend/app/agents/tools.py` — Replace ProductService with SpuService
- `backend/app/services/chat_service.py` — Update any product references

### Create New API Routes

Create `backend/app/api/v1/spus.py`:

```python
# SPU list, detail, listings endpoints for mini-program
# (see contracts/api-contracts.md for full spec)
```

### Update Services

Modify the following services to use `spu_id` instead of `product_id`:

1. **favorite_service.py**: All methods reference `spu_id`
2. **review_service.py**: All methods reference `spu_id`
3. **chat_service.py**: Update `referenced_spus` handling
4. **spu_service.py**: Add mini-program specific query methods

---

## 3. Frontend Setup

### Update API Client

Modify `frontend/src/services/api.ts`:

```typescript
// Before
export const getProducts = (params) => api.get('/products', { params });
export const getProductDetail = (id) => api.get(`/products/${id}`);

// After
export const getSpus = (params) => api.get('/spus', { params });
export const getSpuDetail = (id) => api.get(`/spus/${id}`);
export const getSpuListings = (id) => api.get(`/spus/${id}/listings`);
export const searchSpus = (params) => api.get('/search', { params });
```

### Update Stores

Rename/modify `frontend/src/stores/productStore.ts` → `frontend/src/stores/spuStore.ts`:

```typescript
// Update all product references to spu
// Field names largely unchanged (id, name, brand, price_min, price_max, etc.)
```

### Update Pages

Modify the following pages to use SPU data:

1. **pages/index/index.tsx**: Home page product list → SPU list
2. **pages/product/list.tsx**: Product list → SPU list
3. **pages/product/detail.tsx**: 
   - Product detail → SPU detail
   - Add ingredients, nutrition, pros/cons display
   - Add listings (price comparison) section
4. **pages/product/compare.tsx**: Compare products → Compare SPUs
5. **pages/search/index.tsx**: Search results → SPU results
6. **pages/category/index.tsx**: Category browse → SPU category browse
7. **pages/chat/index.tsx**: AI assistant product cards → SPU cards
8. **pages/mine/favorites.tsx**: Favorite products → Favorite SPUs

### Update Components

Rename/modify `frontend/src/components/ProductCard.tsx` → `frontend/src/components/SpuCard.tsx`:

```typescript
// Props interface: product → spu
// Fields: id, name, brand, price_min, price_max, image_urls (same as SPU schema)
```

---

## 4. AI Assistant Setup

### Update Agent Tools

Modify `backend/app/agents/tools.py`:

```python
from app.services.spu_service import SpuService
from app.services.review_service import ReviewService

class AgentTools:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.spu_service = SpuService(db)  # Changed from ProductService
        self.review_service = ReviewService(db)

    async def search_products(self, pet_type=None, category=None, brand=None, max_price=None):
        # Use SpuService instead of ProductService
        from app.schemas.spu import SpuFilter
        filters = SpuFilter(...)
        spus, _ = await self.spu_service.get_spus(filters)
        return [s.model_dump() for s in spus]

    async def get_product_detail(self, spu_id: int):
        spu = await self.spu_service.get_spu_by_id(spu_id)
        # Return SPU fields...
```

### Update Chat Service

Modify `backend/app/services/chat_service.py`:

```python
# In message creation/handling:
# referenced_products → referenced_spus
```

---

## 5. Testing Checklist

### Database Migration

- [ ] Run `alembic upgrade head` successfully
- [ ] Verify `favorites` table has `spu_id` column with correct FK
- [ ] Verify `reviews` table has `spu_id` column with correct FK
- [ ] Verify `chat_messages` table has `referenced_spus` column
- [ ] Verify `products` table no longer exists
- [ ] Verify `spus` table data intact (33 records)

### API Testing

- [ ] `GET /api/v1/spus` returns SPU list (33 items)
- [ ] `GET /api/v1/spus/{id}` returns full SPU detail
- [ ] `GET /api/v1/spus/{id}/listings` returns listings (if any)
- [ ] `GET /api/v1/search?q=幼猫` returns matching SPUs
- [ ] `GET /api/v1/favorites` returns favorites with SPU data
- [ ] `POST /api/v1/favorites` with `spu_id` adds favorite
- [ ] `DELETE /api/v1/favorites/{spu_id}` removes favorite
- [ ] `GET /api/v1/spus/{id}/reviews` returns reviews
- [ ] `POST /api/v1/reviews` with `spu_id` creates review
- [ ] `POST /api/v1/chat` AI assistant returns SPU recommendations

### Frontend Testing

- [ ] Home page loads SPU list (not empty)
- [ ] SPU detail page shows ingredients, nutrition, pros/cons
- [ ] SPU detail page shows listings price comparison (if available)
- [ ] Search returns SPU results
- [ ] Category filter shows correct SPUs
- [ ] Favorites page shows SPU favorites
- [ ] AI assistant chat shows SPU recommendation cards
- [ ] Clicking SPU card navigates to correct detail page

### Integration Testing

- [ ] End-to-end: User searches → clicks SPU → views detail → sees listings → clicks listing link
- [ ] End-to-end: User asks AI → gets SPU recommendation → clicks card → views detail
- [ ] End-to-end: User favorites SPU → views favorites → clicks SPU → views detail

---

## 6. Troubleshooting

### Migration Fails: Foreign Key Constraint

**Problem**: Cannot rename column due to existing FK constraint

```bash
# Check for remaining FKs to products
psql $DATABASE_URL -c "\d favorites"
psql $DATABASE_URL -c "\d reviews"

# If any FKs remain, drop them manually
psql $DATABASE_URL -c "ALTER TABLE favorites DROP CONSTRAINT fk_favorites_product_id;"
psql $DATABASE_URL -c "ALTER TABLE reviews DROP CONSTRAINT fk_reviews_product_id;"
```

### Products Table Not Empty

**Problem**: `products` table still has data but migration tries to drop it

**Solution**: Migration assumes products table is empty (as per spec clarification). If data exists:
1. Back up data: `pg_dump --table=products ...`
2. Either migrate data to SPUs first, or manually handle before running DROP

### Frontend 404 on Old Product Links

**Problem**: Mini-program still references `/products/{id}` endpoints

**Solution**: 
1. Search frontend for all `/products` API calls: `grep -r "/products" frontend/src/`
2. Replace with `/spus` endpoints
3. Search for `product_id` in params and rename to `spu_id`

### AI Assistant Returns Old Product References

**Problem**: AI assistant still searches products table

**Solution**:
1. Verify `backend/app/agents/tools.py` uses `SpuService`
2. Verify `backend/app/services/chat_service.py` uses `referenced_spus`
3. Restart backend service

---

## 7. Performance Verification

After migration, verify performance criteria:

```bash
# SPU list API performance
curl -w "@curl-format.txt" -o /dev/null -s \
  "http://localhost:8001/v1/spus?page=1&page_size=20"
# Expected: < 200ms

# Search API performance
curl -w "@curl-format.txt" -o /dev/null -s \
  "http://localhost:8001/v1/search?q=幼猫"
# Expected: < 200ms

# SPU detail API performance
curl -w "@curl-format.txt" -o /dev/null -s \
  "http://localhost:8001/v1/spus/1"
# Expected: < 200ms
```

---

## 8. Rollback Plan

**⚠️ Warning**: `products` table DROP is irreversible without backup.

If rollback needed before products drop:
```bash
alembic downgrade -1
```

After products table is dropped, rollback requires restoring from database backup.

**Recommended**: Take full database backup before migration:
```bash
pg_dump $DATABASE_URL > backup_before_005.sql
```

---

## 9. Next Steps

After migration verified:
1. **Monitor error logs** for any remaining `products` references
2. **Run full test suite** (backend + frontend)
3. **Verify mini-program bundle size** (should not increase significantly)
4. **Monitor AI assistant response quality** with SPU data
5. **Add more SPU data** to expand catalog coverage
