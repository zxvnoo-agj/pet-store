# API Contracts: 宠物档案与AI能力增强

**Date**: 2026-05-24  
**Feature**: 006-pet-profiles-ai  
**Base Path**: `/api/v1/`

## Overview

New endpoints for pet CRUD, breed listing, AI suggested questions, and last pet selection. All endpoints require authentication (except breed list which is public for registration form).

---

## 1. 宠物管理（小程序端）

### 1.1 List My Pets

```
GET /api/v1/pets
```

Returns all pets belonging to the authenticated user.

**Auth**: Required (Bearer token)

**Response** (200):

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pets": [
      {
        "id": 1,
        "species": "cat",
        "breed": { "id": 3, "name": "英短" },
        "nickname": "团子",
        "age_months": 3,
        "weight_kg": 1.5,
        "notes": "刚接回家，在适应中",
        "created_at": "2026-05-24T10:00:00Z"
      }
    ],
    "total": 2
  }
}
```

### 1.2 Create Pet

```
POST /api/v1/pets
```

Add a new pet to the user's profile.

**Auth**: Required

**Request Body**:

```json
{
  "species": "cat",
  "breed_id": 3,
  "nickname": "团子",
  "age_months": 3,
  "weight_kg": 1.5,
  "notes": "刚接回家，在适应中"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| species | string | YES | cat/dog/bird/fish/reptile/small_pet/other |
| breed_id | int | NO | Must be valid breed for selected species |
| nickname | string | NO | Max 32 chars |
| age_months | int | NO | ≥ 0 |
| weight_kg | number | NO | > 0, precision 2 decimal places |
| notes | string | NO | Max 500 chars |

**Response** (201): Created pet object (same shape as list item).

**Errors**:

| Code | Condition |
|------|-----------|
| 400 | Max 5 pets reached |
| 400 | Duplicate (species, nickname) for this user |
| 400 | breed_id does not match species |

### 1.3 Update Pet

```
PUT /api/v1/pets/{pet_id}
```

Edit an existing pet's information.

**Auth**: Required (must own pet)

**Request Body**: Same schema as `POST /api/v1/pets` (all fields optional, only provided fields updated).

**Response** (200): Updated pet object.

**Errors**:

| Code | Condition |
|------|-----------|
| 404 | Pet not found or not owned by user |
| 400 | Duplicate (species, nickname) after update |

### 1.4 Delete Pet

```
DELETE /api/v1/pets/{pet_id}
```

Remove a pet from the user's profile.

**Auth**: Required (must own pet)

**Response** (204): No content.

**Errors**:

| Code | Condition |
|------|-----------|
| 404 | Pet not found or not owned by user |

---

## 2. 品种查询（小程序端，公开）

### 2.1 List Breeds by Species

```
GET /api/v1/pet-breeds
```

Returns active breeds for dropdown selection.

**Auth**: Not required (needed for registration form pre-login)

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| species | string | YES | cat/dog/bird/fish/reptile/small_pet/other |

**Response** (200):

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "breeds": [
      { "id": 1, "name": "布偶", "description": "温顺亲人，长毛大型猫" },
      { "id": 2, "name": "英短", "description": "圆脸短毛，性格独立" },
      { "id": 3, "name": "美短", "description": "活泼好动，适应力强" }
    ]
  }
}
```

---

## 3. 最后选中宠物（小程序端）

### 3.1 Get Last Selected Pet

```
GET /api/v1/pets/last-selected
```

Returns the pet ID the user last selected on the homepage.

**Auth**: Required

**Response** (200):

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pet_id": 3
  }
}
```

Returns `null` if no selection history.

### 3.2 Set Last Selected Pet

```
PUT /api/v1/pets/last-selected
```

Record which pet the user selected on the homepage.

**Auth**: Required

**Request Body**:

```json
{
  "pet_id": 3
}
```

**Response** (200): `{ "pet_id": 3 }`

**Errors**:

| Code | Condition |
|------|-----------|
| 400 | pet_id does not belong to user |

---

## 4. AI 推荐问题（小程序端）

### 4.1 Get Suggested Questions

```
GET /api/v1/chat/suggested-questions
```

Returns AI-generated or cached suggested questions for the chat input area. Falls back to defaults on any error.

**Auth**: Not required (returns generic questions for anonymous users)

**Response** (200):

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "questions": [
      "3个月英短适合什么猫粮？",
      "英短幼猫每天喂食量是多少？",
      "猫咪疫苗什么时候打？",
      "如何帮幼猫适应新环境？"
    ],
    "source": "ai"
  }
}
```

**Source values**:
- `"ai"` — Generated from pet context (user has pets)
- `"cache"` — Served from Redis cache (user has pets, 24h TTL)
- `"default"` — Hardcoded fallback (no pets or generation failed)

**Cache behavior**:
- Key: `suggested_questions:{user_id}`, TTL: 86400s
- Invalidated on pet add/edit/delete
- Empty response → generate via LLM → cache → return

---

## 5. 用户信息（扩展）

### 5.1 Get Current User (Modified)

```
GET /api/v1/users/me
```

Response now includes pets array.

**Auth**: Required

**Response** (200) — new fields in bold:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": 1,
      "nickname": "养宠达人",
      "avatar_url": "https://...",
      "pets": [
        {
          "id": 1,
          "species": "cat",
          "breed_name": "英短",
          "nickname": "团子"
        }
      ],
      "pet_count": 1
    }
  }
}
```

---

## 6. Admin: 品种管理

### 6.1 List Breeds (Admin)

```
GET /api/v1/admin/pet-breeds
```

**Auth**: Admin required  
**Query**: species (optional filter), page, page_size

**Response**: Paginated breed list with is_active, sort_order, timestamps.

### 6.2 Create Breed (Admin)

```
POST /api/v1/admin/pet-breeds
```

**Request**: `{ "species": "cat", "name": "缅因", "description": "..." }`  
**Response** (201): Created breed.

### 6.3 Update Breed (Admin)

```
PUT /api/v1/admin/pet-breeds/{breed_id}
```

### 6.4 Delete Breed (Admin)

```
DELETE /api/v1/admin/pet-breeds/{breed_id}
```

Soft delete preferred (set `is_active = false`); hard delete if no pets reference it.

---

## Response Format

All endpoints wrap in standard `ApiResponse`:

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

Error:

```json
{
  "code": 400,
  "message": "error",
  "data": null,
  "detail": "Max 5 pets reached"
}
```
