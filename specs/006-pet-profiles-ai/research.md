# Research Notes: 宠物档案与AI能力增强

**Feature**: 006-pet-profiles-ai  
**Date**: 2026-05-24

## R1: AI Suggested Questions Generation Strategy

**Decision**: Hybrid caching with 24-hour TTL. Generate via LLM on cache miss, store in Redis, serve from cache on hit. Fall back to hardcoded defaults on any failure (silent).

**Rationale**:
- LLM generation is slow (~1-3 seconds) and costly per invocation. Caching avoids repeated API calls.
- 24-hour TTL balances freshness with cost. Pet info changes infrequently.
- Silent degradation keeps UX smooth — users see questions regardless of backend state.

**Alternatives considered**:
- Per-request generation: Too slow, too expensive at scale.
- Template-based generation (fill pet name/species into templates): Lacks variety, feels mechanical.
- Weekly batch generation: Delays fresh questions after pet profile changes.

**Prompt design**: Instruct LLM to generate 3-5 questions relevant to user's pets. Include species, breed, age as context. Output as JSON array of strings.

```
System: You are generating suggested questions for a pet supplies mini-program.
User has the following pets: [pet descriptions].
Generate 3-5 natural-language questions the user might want to ask about pet supplies or care.
Output ONLY a JSON array of strings. Example: ["What food is best for my 3-month-old kitten?"]
```

**Cache key**: `suggested_questions:{user_id}`  
**Cache TTL**: 86400 (24 hours)  
**Invalidation**: On pet add/edit/delete, delete the cache key.

## R2: Pet Breed Data Seeding

**Decision**: Seed cat and dog breeds via Alembic migration data migration. Admin backend provides CRUD UI. Initial dataset covers ~30 cat breeds and ~50 dog breeds (common in China).

**Rationale**:
- Data must exist before users can select breeds. Migration seeding ensures data availability at deploy time.
- Admin CRUD allows non-technical staff to add rare breeds without code changes.
- Initial dataset covers 90%+ of expected user selections.

**Alternatives considered**:
- Static JSON config: Requires redeploy for additions, violates user's Q1=B choice.
- User free-text input: Loses data quality for AI context injection (inconsistent naming).
- Third-party API lookup: Adds external dependency, unnecessary for this scope.

**Breed data structure**:

```python
class PetBreed(Base):
    __tablename__ = "pet_breeds"
    id: int (PK)
    species: str  # 'cat', 'dog', 'bird', 'fish'
    name: str     # '英短', '布偶', '金毛'
    description: str (optional)
    is_active: bool (default True)
    sort_order: int (default 0)
```

**Seed data (representative subset)**:

Cats: 英短, 美短, 布偶, 暹罗, 缅因, 波斯, 折耳, 无毛, 橘猫, 三花, 狸花, 加菲, 德文, 阿比西尼亚, 孟加拉, 俄罗斯蓝猫, 挪威森林, 土耳其梵猫, 新加坡猫, 曼基康

Dogs: 金毛, 拉布拉多, 柯基, 泰迪, 比熊, 柴犬, 哈士奇, 萨摩耶, 边牧, 德牧, 法斗, 英斗, 博美, 雪纳瑞, 约克夏, 吉娃娃, 杜宾, 罗威纳

## R3: AI Pet Context Injection Format

**Decision**: Inject pet info as structured text block appended to system prompt before user message. Only include fields with values.

**Rationale**:
- Structured format is parseable by LLM without ambiguity.
- Omitting empty fields reduces token waste and prevents LLM hallucination.
- Appending to system prompt (not user message) keeps it invisible to user but available for LLM reasoning.

**Format**:

```
## 用户宠物信息
- 宠物1: 英短猫, 昵称"团子", 3个月大, 体重1.5kg, 备注: 刚接回家还在适应
- 宠物2: 布偶猫, 昵称"棉花", 2岁, 体重4.2kg
```

**Alternatives considered**:
- JSON format: Verbose, wastes tokens.
- Natural language narrative: LLM may miss structured fields.
- Tool-call injection: Overcomplicates; simple prompt suffix is sufficient.

**Token budget**: Reserve ~100 tokens per pet (max 5 pets = 500 tokens). Truncate notes field to 50 chars if needed.

## R4: Last Selected Pet Persistence

**Decision**: Store last selected pet ID in user's profile JSONB field (`users.profile`). Read on homepage load, write on pet card tap.

**Rationale**:
- profile JSONB already exists on users table. Adding a key there requires zero migration.
- This is per-user, non-sensitive data that fits naturally with other preferences.
- Simple: no new table, no cache layer, single DB read/write.

**Alternatives considered**:
- Local storage (mini-program): Lost on device change, not truly cross-session.
- Separate `user_preferences` table: Over-engineered for a single value.
- Redis: Unnecessary persistence layer for low-frequency write.

**Implementation**:
```python
# Read
last_pet_id = user.profile.get("last_selected_pet_id")

# Write
user.profile["last_selected_pet_id"] = pet_id
await db.commit()
```

## R5: Pet-User Relationship Modeling

**Decision**: New `pets` table with FK to `users.id`, plus `pet_breeds` lookup table. Remove `users.pet_types` JSONB field usage (keep column for backward compatibility, stop writing to it).

**Rationale**:
- Independent table supports CRUD operations natively, proper indexing, and FK constraints.
- Breed lookup table enables admin management and standardized values.
- Migrating away from JSONB pet_types avoids data quality issues and enables richer queries.
- Keeping the column avoids breaking existing code during migration; progressively migrate reads.

**Alternatives considered**:
- Extend JSONB pet_types into JSONB pets array: Queries become complex, no FK enforcement, hard to add breed reference.
- Extend users table with pet columns: Doesn't support multiple pets per user.
