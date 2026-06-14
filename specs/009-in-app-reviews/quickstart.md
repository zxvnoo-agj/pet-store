# Quickstart: 自建用户评价功能

**Feature**: 009-in-app-reviews | **Date**: 2026-06-14

## 1. Backend setup

```bash
cd backend
venv/bin/alembic upgrade head
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For WeChat DevTools in WSL2, keep `frontend/src/config/env.ts` pointing to `127.0.0.1` and rebuild the mini-program after API changes.

## 2. Run focused backend tests

```bash
cd backend
venv/bin/pytest tests/unit/test_sensitive_words.py tests/unit/test_review_service.py
venv/bin/pytest tests/integration/test_in_app_reviews.py
venv/bin/pytest tests/contract/test_review_api_contract.py
```

## 3. Validate mini-program flow

```bash
cd frontend
npm run build:weapp
```

Manual acceptance in WeChat DevTools:

1. Open an SPU detail page.
2. Enter the reviews tab/page.
3. Tap "写评价".
4. Submit rating, text content <= 500 chars, and recommendation flag.
5. Confirm the submitted review appears only to the author as "等待审核".
6. Confirm another user or logged-out state cannot see pending content.

## 4. Validate admin moderation

```bash
cd admin
npm run build
```

Manual acceptance in admin:

1. Open `评价审核`.
2. Filter `source=user`, `status=pending`.
3. Approve one user review.
4. Reopen the mini-program review page and confirm the review is public.
5. Reject another review with a reason and confirm it remains hidden from public list.
6. Add an `admin_seed` review and confirm it appears as "运营整理".

## 5. Validate source behavior

Seed or create one review per source:

- `user`
- `xhs_manual`
- `xhs_auto`
- `admin_seed`

Open the mini-program review list and confirm all approved reviews are shown under "真实评价" with distinct source labels.

## 6. Validate AI summary

Trigger admin summary regeneration for an SPU with at least three approved reviews:

```bash
curl -X POST http://127.0.0.1:8000/v1/admin/spus/12/reviews/summary/regenerate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Confirm `ai_review_summary.review_count` matches approved review count and includes all sources.

## Notes

- Do not delete tables during this feature.
- User reviews are text-only in this version.
- Rejected review reasons are stored for admin audit only; no user notification is required in 009.
