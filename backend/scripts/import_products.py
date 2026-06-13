#!/usr/bin/env python3
"""
Import product JSON files into SPU table.

Usage:
    python scripts/import_products.py path/to/products.json [path/to/more.json ...]
    python scripts/import_products.py --dry-run path/to/products.json
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.models.spu import Spu

REQUIRED_FIELDS = ["brand", "name", "model", "pet_type", "category_id"]


def validate_item(item: dict, idx: int) -> list[str]:
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in item or item[field] is None:
            errors.append(f"item[{idx}]: missing required field '{field}'")
    if "pet_type" in item and item["pet_type"] not in ("cat", "dog"):
        errors.append(f"item[{idx}]: invalid pet_type '{item.get('pet_type')}'")
    return errors


async def import_file(
    session,
    path: Path,
    cats_by_id: dict,
    cats_by_key: dict,
    dry_run: bool = False,
    strict: bool = False,
) -> dict:
    with open(path, encoding="utf-8") as f:
        items = json.load(f)

    result = {"added": 0, "skipped": 0, "errors": []}
    file_ok = True

    for idx, item in enumerate(items):
        errs = validate_item(item, idx)
        if errs:
            file_ok = False
            for e in errs:
                result["errors"].append(f"  ! {e}")
            continue

        cat_id = item["category_id"]
        cat = cats_by_id.get(cat_id)
        if not cat:
            cat = cats_by_key.get((item["pet_type"], str(cat_id)))
        if not cat:
            msg = f"  ! Category id={cat_id} not found, skipping: {item['name']}"
            result["errors"].append(msg)
            file_ok = False
            result["skipped"] += 1
            continue

        if dry_run:
            result["added"] += 1
            continue

        stmt = pg_insert(Spu).values(
            category_id=cat.id,
            brand=item["brand"],
            name=item["name"],
            model=item["model"],
            pet_type=item["pet_type"],
            description=item.get("description"),
            ingredients=item.get("ingredients", []),
            nutrition=item.get("nutrition", {}),
            pros=item.get("pros", []),
            cons=item.get("cons", []),
            extra_attrs=item.get("extra_attrs", {}),
            status=item.get("status", "active"),
        ).on_conflict_do_nothing(constraint="uq_spus_brand_category_name_model")

        try:
            r = await session.execute(stmt)
            if r.rowcount:
                result["added"] += 1
            else:
                result["skipped"] += 1
        except Exception as e:
            result["errors"].append(f"  ! DB error for '{item['name']}': {e}")
            result["skipped"] += 1
            file_ok = False

    if not dry_run:
        await session.commit()

    result["file_ok"] = file_ok
    return result


async def main():
    parser = argparse.ArgumentParser(
        description="Import product JSON files into SPU table",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "JSON format:\n"
            "  Each item should have: brand, name, model, pet_type, category_id\n"
            "  Optional: description, ingredients[], nutrition{}, pros[], cons[],\n"
            "            extra_attrs{}, status"
        ),
    )
    parser.add_argument("files", nargs="+", type=Path, help="Path(s) to product JSON file(s)")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Validate only, no DB writes")
    parser.add_argument("--strict", "-s", action="store_true", help="Fail on first invalid file")
    args = parser.parse_args()

    existing = [f for f in args.files if f.exists()]
    missing = [str(f) for f in args.files if not f.exists()]
    if missing:
        print(f"⚠ Skipping (not found): {', '.join(missing)}")
    if not existing:
        print("No valid files found.")
        sys.exit(1)

    async with AsyncSessionLocal() as session:
        r = await session.execute(select(Category))
        cats = r.scalars().all()
        cats_by_id = {c.id: c for c in cats}
        cats_by_key = {(c.pet_type, c.name): c for c in cats}

        grand = {"added": 0, "skipped": 0, "errors": []}

        for path in existing:
            print(f"\n{'───' * 20}")
            print(f"File: {path}")
            result = await import_file(session, path, cats_by_id, cats_by_key, args.dry_run, args.strict)
            grand["added"] += result["added"]
            grand["skipped"] += result["skipped"]
            grand["errors"].extend(result["errors"])

            tag = " [DRY-RUN]" if args.dry_run else ""
            print(f"  +{result['added']} added, -{result['skipped']} skipped{tag}")
            for e in result["errors"]:
                print(e)
            if args.strict and not result["file_ok"]:
                print("Strict mode: aborting on first invalid file.")
                sys.exit(1)

        print(f"\n{'═══' * 20}")
        print(f"Done: {grand['added']} added, {grand['skipped']} skipped total")
        if grand["errors"]:
            print(f"Errors: {len(grand['errors'])}")
        if args.dry_run:
            print("(dry-run, no writes committed)")
        print(f"{'═══' * 20}")


if __name__ == "__main__":
    asyncio.run(main())
