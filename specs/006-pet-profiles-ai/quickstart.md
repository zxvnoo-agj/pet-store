# Quick Start Guide: 宠物档案与AI能力增强

**Feature**: 006-pet-profiles-ai  
**Date**: 2026-05-24  
**Prerequisites**: Feature 005 deployed (spus + spu_listings tables exist, favorites/reviews migrated)

## 1. Database Migration

```bash
cd backend
alembic upgrade head
```

Creates `pets` and `pet_breeds` tables, seeds ~80 breeds (30 cats, 50 dogs).

Verify:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pet_breeds;"  # Should return ~80
psql $DATABASE_URL -c "SELECT * FROM pet_breeds WHERE species='cat' LIMIT 5;"
```

## 2. Backend Setup

### New Files

Copy/implement these files in order:

```bash
# Models
touch backend/app/models/pet.py
touch backend/app/models/pet_breed.py
touch backend/app/models/__init__.py  # add imports for new models
```

### Modified Files

Update `backend/app/main.py` — register new router:

```python
from app.api.v1 import pets
app.include_router(pets.router, prefix="/api/v1")
```

### Start Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8001
```

### Verify APIs

```bash
# List breeds (public)
curl http://localhost:8001/api/v1/pet-breeds?species=cat

# Create pet (requires auth)
curl -X POST http://localhost:8001/api/v1/pets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"species":"cat","breed_id":3,"nickname":"团子","age_months":3}'

# List my pets
curl http://localhost:8001/api/v1/pets \
  -H "Authorization: Bearer <token>"
```

## 3. Frontend Setup

### New Pages

Create:
- `frontend/src/pages/mine/pets.tsx` — Pet management list
- `frontend/src/pages/mine/pets-create.tsx` — Add/edit pet form

### Page Routes

Add to `frontend/src/app.config.ts`:

```typescript
pages: [
  // ...existing
  'pages/mine/pets',
  'pages/mine/pets-create',
]
```

### Modified Files

1. `frontend/src/stores/authStore.ts` — Add pets array to user state
2. `frontend/src/pages/index/index.tsx` — Pet cards logic (US3)
3. `frontend/src/pages/mine/index.tsx` — Add "宠物管理" entry
4. `frontend/src/pages/chat/index.tsx` — Dynamic suggested questions
5. `frontend/src/types/index.ts` — Add Pet, PetBreed interfaces

### Start Frontend

```bash
cd frontend
npm run dev:weapp  # or npm run dev:h5
```

## 4. AI Context Verification

### Test Chat with Pets

1. Create a pet via API or UI
2. Open chat page, send "推荐猫粮"
3. Check server logs for injected pet context in system prompt
4. Verify AI response references the pet's age/species

```bash
# Check the AI context injection in logs
grep "用户宠物信息" backend/logs/app.log
```

### Test Suggested Questions

1. Visit `/api/v1/chat/suggested-questions` with auth
2. First call should trigger LLM generation (visible via longer response time)
3. Second call should serve from Redis cache (<50ms)
4. Delete pet, verify cache invalidation

## 5. Admin Breed Management

Access the admin interface at `/admin/pet-breeds` to manage breed data.

```bash
# Seed additional breeds via admin API
curl -X POST http://localhost:8001/api/v1/admin/pet-breeds \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"species":"cat","name":"苏格兰折耳","description":"以独特的折叠耳朵闻名"}'
```

## 6. Test Checklist

### Manual Tests

- [ ] Register new user → add pet wizard appears → skip → homepage shows default tabs
- [ ] Add pet with complete info → appears in pet management list
- [ ] Add pet with same species+nickname → error "已存在同名宠物"
- [ ] Add 6th pet → error "最多添加5只宠物"
- [ ] Homepage shows pet cards (not default tabs) when user has pets
- [ ] Tapping different pet card → recommendations change
- [ ] "选择其他" button → species selector → select species → recommendations update
- [ ] Edit pet → changes reflected on homepage
- [ ] Delete pet → card removed from homepage
- [ ] Chat with pet context → AI mentions pet details in response
- [ ] Chat page shows personalized suggested questions
- [ ] Chat page shows defaults when no pets
- [ ] Suggested questions cache hit (fast second load)

### Automated Tests

```bash
# Backend unit tests
cd backend && pytest tests/unit/test_pet_service.py -v

# Backend integration tests
cd backend && pytest tests/integration/test_pet_api.py -v

# Backend contract tests
cd backend && pytest tests/contract/test_pet_contracts.py -v
```
