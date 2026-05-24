# Data Model: 宠物档案与AI能力增强

**Date**: 2026-05-24  
**Feature**: 006-pet-profiles-ai  
**Based on**: Feature 006 spec + research.md + Existing 001-005 data model

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-24 | Initial creation | Feature 006 design — new pets + pet_breeds tables |

## Summary of Changes

This feature introduces **2 new tables** and **1 modified column**.

### New Tables

| Table | Purpose |
|-------|---------|
| `pets` | User pet profiles (CRUD by user) |
| `pet_breeds` | Standardized breed catalog (admin managed) |

### Modified Columns

| Table | Change | Reason |
|-------|--------|--------|
| `users` | `pet_types` column deprecated (kept for compat) | Replaced by `pets` table; stop writing, read from pets |

---

## New Table: pets

Stores individual pet profiles owned by users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| user_id | INTEGER | NOT NULL, FK → users.id ON DELETE CASCADE | Owner |
| species | VARCHAR(16) | NOT NULL, CHECK IN ('cat','dog','bird','fish','reptile','small_pet','other') | Pet species |
| breed_id | INTEGER | nullable, FK → pet_breeds.id ON SET NULL | Breed reference |
| nickname | VARCHAR(32) | NOT NULL | Pet name/nickname |
| age_months | INTEGER | nullable, CHECK ≥ 0 | Age in months |
| weight_kg | NUMERIC(5,2) | nullable, CHECK > 0 | Weight in kg |
| notes | TEXT | nullable | Free-form notes (max 500 chars) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints**:
- `uq_user_species_nickname` UNIQUE(user_id, species, nickname) — prevents duplicate pets
- FK(user_id) REFERENCES users(id) ON DELETE CASCADE
- FK(breed_id) REFERENCES pet_breeds(id) ON DELETE SET NULL — deleting a breed doesn't delete the pet
- CHECK(species IN ('cat','dog','bird','fish','reptile','small_pet','other'))

**Indexes**:
- `ix_pets_user_id` on user_id (list my pets)
- `ix_pets_species` on species (filter by species)

**Validation Rules** (application layer):
- Max 5 pets per user
- Species is required
- At least one of (nickname, breed_id) must be provided
- Notes max 500 characters

---

## New Table: pet_breeds

Standardized breed reference data managed by admin.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| species | VARCHAR(16) | NOT NULL, CHECK same as pets.species | Species this breed belongs to |
| name | VARCHAR(64) | NOT NULL | Breed name (e.g., '英短', '布偶', '金毛') |
| description | VARCHAR(256) | nullable | Brief breed description |
| is_active | BOOLEAN | DEFAULT TRUE | Whether breed is selectable |
| sort_order | INTEGER | DEFAULT 0 | Display sort weight |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints**:
- `uq_pet_breeds_species_name` UNIQUE(species, name) — no duplicate breed per species

**Indexes**:
- `ix_pet_breeds_species` on (species, sort_order) — breed listing by species
- `ix_pet_breeds_active` on (species, is_active) — active breeds only

---

## Modified Table: users

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| pet_types | JSONB | **Deprecated** — kept for backward compat | No longer written; reads migrate to pets table |
| profile | JSONB | **Extended** — new key added | `last_selected_pet_id` for homepage default selection |

**Migration approach**:
- `pet_types` column remains (non-breaking). Application code stops writing to it.
- Existing `pet_types` data can be migrated to `pets` table as initial profiles (optional data migration script).
- `profile` JSONB gains `last_selected_pet_id` key (no schema change needed).

---

## Entity Relationship Diagram

```
┌───────────────────┐         ┌───────────────────┐
│      users        │         │    pet_breeds     │
├───────────────────┤         ├───────────────────┤
│ id (PK)           │         │ id (PK)           │
│ openid            │         │ species           │
│ nickname          │         │ name              │
│ profile (JSONB)   │         │ description       │
│   └─ last_pet_id  │         │ is_active         │
│ pet_types (depr)  │         │ sort_order        │
└────────┬──────────┘         └────────┬──────────┘
         │ 1:N                         │ N:1
         ▼                             ▼
┌───────────────────┐
│       pets        │
├───────────────────┤
│ id (PK)           │
│ user_id (FK)      │
│ species           │
│ breed_id (FK)     │
│ nickname          │
│ age_months        │
│ weight_kg         │
│ notes             │
│ created_at        │
│ updated_at        │
└───────────────────┘
```

---

## Query Patterns

### 1. List User's Pets

```sql
SELECT p.id, p.species, p.nickname, p.age_months, p.weight_kg, p.notes,
       b.name as breed_name, b.id as breed_id
FROM pets p
LEFT JOIN pet_breeds b ON p.breed_id = b.id
WHERE p.user_id = ?
ORDER BY p.created_at ASC;
```

### 2. Get Active Breeds by Species

```sql
SELECT id, name, description
FROM pet_breeds
WHERE species = ? AND is_active = TRUE
ORDER BY sort_order ASC, name ASC;
```

### 3. Last Selected Pet

```sql
SELECT profile->>'last_selected_pet_id' FROM users WHERE id = ?;
```

### 4. Inject Pet Context into AI (Application Query)

```python
pets = await db.execute(
    select(Pet).where(Pet.user_id == user_id).order_by(Pet.created_at)
)
```

---

## Data Integrity Rules

1. **Pet Uniqueness**: Same user cannot have duplicate (species, nickname) pairs.
2. **Pet Count Limit**: Maximum 5 pets per user (enforced at application layer before INSERT).
3. **Cascade Delete**: Deleting a user cascades to their pets.
4. **Breed Delete Safety**: Deleting a breed sets breed_id to NULL on referencing pets (SET NULL).
5. **Notes Truncation**: Application layer truncates notes to 500 chars before DB write.

---

## Alembic Migration

Migration file: `backend/alembic/versions/007_pet_profiles.py`

```python
def upgrade():
    # Create pet_breeds table
    op.create_table(
        'pet_breeds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('species', sa.String(16), nullable=False),
        sa.Column('name', sa.String(64), nullable=False),
        sa.Column('description', sa.String(256), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('species', 'name', name='uq_pet_breeds_species_name'),
    )
    op.create_index('ix_pet_breeds_species', 'pet_breeds', ['species', 'sort_order'])
    op.create_index('ix_pet_breeds_active', 'pet_breeds', ['species', 'is_active'])

    # Create pets table
    op.create_table(
        'pets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('species', sa.String(16), nullable=False),
        sa.Column('breed_id', sa.Integer(), nullable=True),
        sa.Column('nickname', sa.String(32), nullable=False),
        sa.Column('age_months', sa.Integer(), nullable=True),
        sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'species', 'nickname', name='uq_user_species_nickname'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['breed_id'], ['pet_breeds.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_pets_user_id', 'pets', ['user_id'])
    op.create_index('ix_pets_species', 'pets', ['species'])

    # Seed breeds (as data migration)
    seed_breeds(op)

def downgrade():
    op.drop_table('pets')
    op.drop_table('pet_breeds')
```
