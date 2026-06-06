#!/usr/bin/env python3
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.models.spu import Spu

CATEGORY_OVERRIDE = {
    40: "干粮",
    41: "湿粮",
}


async def import_file(session, path: Path, cats_by_id: dict, cats_by_key: dict) -> tuple:
    with open(path, encoding="utf-8") as f:
        items = json.load(f)

    added = 0
    skipped = 0
    for item in items:
        cat_id = item["category_id"]
        override_name = CATEGORY_OVERRIDE.get(cat_id)
        if override_name:
            cat = cats_by_key.get((item["pet_type"], override_name))
        else:
            cat = cats_by_id.get(cat_id)
        if not cat:
            print(f"  ! Category id={cat_id} not found, skipping: {item['name']}")
            skipped += 1
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
        ).on_conflict_do_nothing(
            constraint="uq_spus_brand_category_name_model"
        )
        result = await session.execute(stmt)
        if result.rowcount:
            added += 1
        else:
            skipped += 1

    await session.commit()
    return added, skipped


async def main():
    parser = argparse.ArgumentParser(description="Import SPU data from JSON file(s)")
    parser.add_argument("files", nargs="+", type=Path, help="Path(s) to SPU JSON file(s)")
    args = parser.parse_args()

    existing_files = [f for f in args.files if f.exists()]
    if not existing_files:
        print("No valid files found.")
        sys.exit(1)

    missing = [str(f) for f in args.files if not f.exists()]
    if missing:
        print(f"Skipping (not found): {', '.join(missing)}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Category))
        cats = result.scalars().all()
        cats_by_id = {c.id: c for c in cats}
        cats_by_key = {(c.pet_type, c.name): c for c in cats}

        total_added = 0
        for path in existing_files:
            print(f"\nImporting: {path}")
            added, skipped = await import_file(session, path, cats_by_id, cats_by_key)
            total_added += added
            print(f"  -> {added} added, {skipped} skipped (already exist)")

    print(f"\nTotal: {total_added} SPUs imported.")


if __name__ == "__main__":
    asyncio.run(main())
