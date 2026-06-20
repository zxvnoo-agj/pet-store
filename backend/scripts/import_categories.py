#!/usr/bin/env python3
"""
Import category tree JSON into the categories table.

Usage:
    DEBUG=false venv/bin/python scripts/import_categories.py ../backend/data/pet_categories.json
    DEBUG=false venv/bin/python scripts/import_categories.py --dry-run ../backend/data/pet_categories.json

The import is intentionally non-destructive: it never deletes categories.
Existing categories are matched by (pet_type, name) or any configured alias.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.category import Category


def _names(item: dict[str, Any]) -> list[str]:
    return [item["name"], *item.get("aliases", [])]


def _normalize_roots(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        raise ValueError("Category JSON must be a list of root categories")

    for root in raw:
        if not isinstance(root, dict):
            raise ValueError("Each root category must be an object")
        for field in ("name", "pet_type"):
            if not root.get(field):
                raise ValueError(f"Root category missing required field: {field}")
        for child in root.get("children", []):
            if not isinstance(child, dict) or not child.get("name"):
                raise ValueError(f"Invalid child category under {root['name']}")

    return raw


def _find_existing(
    existing_by_pet_name: dict[tuple[str, str], Category],
    pet_type: str,
    item: dict[str, Any],
) -> Category | None:
    for name in _names(item):
        category = existing_by_pet_name.get((pet_type, name))
        if category:
            return category
    return None


def _apply_values(
    category: Category,
    item: dict[str, Any],
    *,
    pet_type: str,
    parent_id: int | None,
    level: int,
    update_existing: bool,
) -> bool:
    if not update_existing:
        return False

    changed = False
    values = {
        "name": item["name"],
        "pet_type": pet_type,
        "parent_id": parent_id,
        "level": level,
        "icon": item.get("icon"),
        "sort_order": item.get("sort_order", 0),
        "is_active": item.get("is_active", True),
    }
    for key, value in values.items():
        if getattr(category, key) != value:
            setattr(category, key, value)
            changed = True
    return changed


async def import_categories(
    json_path: Path,
    *,
    dry_run: bool,
    update_existing: bool,
) -> dict[str, int]:
    raw = json.loads(json_path.read_text(encoding="utf-8"))
    roots = _normalize_roots(raw)

    stats = {"added": 0, "updated": 0, "skipped": 0}

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Category).order_by(Category.id.asc()))
        existing = result.scalars().all()
        existing_by_pet_name = {(c.pet_type, c.name): c for c in existing}

        async def upsert(
            item: dict[str, Any],
            *,
            pet_type: str,
            parent_id: int | None,
            level: int,
        ) -> Category:
            category = _find_existing(existing_by_pet_name, pet_type, item)
            if category:
                changed = _apply_values(
                    category,
                    item,
                    pet_type=pet_type,
                    parent_id=parent_id,
                    level=level,
                    update_existing=update_existing,
                )
                if changed:
                    stats["updated"] += 1
                    print(f"  ~ {pet_type} / {item['name']}")
                else:
                    stats["skipped"] += 1
                    print(f"  = {pet_type} / {item['name']}")
                existing_by_pet_name[(pet_type, item["name"])] = category
                return category

            category = Category(
                name=item["name"],
                pet_type=pet_type,
                parent_id=parent_id,
                level=level,
                icon=item.get("icon"),
                sort_order=item.get("sort_order", 0),
                is_active=item.get("is_active", True),
            )
            stats["added"] += 1
            print(f"  + {pet_type} / {item['name']}")

            if not dry_run:
                session.add(category)
                await session.flush()
                existing_by_pet_name[(pet_type, category.name)] = category

            return category

        for root in roots:
            parent = await upsert(
                root,
                pet_type=root["pet_type"],
                parent_id=None,
                level=1,
            )
            parent_id = None if dry_run else parent.id
            for child in root.get("children", []):
                await upsert(
                    child,
                    pet_type=root["pet_type"],
                    parent_id=parent_id,
                    level=2,
                )

        if dry_run:
            await session.rollback()
        else:
            await session.commit()

    return stats


async def main() -> None:
    parser = argparse.ArgumentParser(description="Import category tree JSON")
    parser.add_argument("json_file", type=Path, help="Path to category JSON file")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Validate and print changes without writing")
    parser.add_argument(
        "--no-update-existing",
        action="store_true",
        help="Only create missing categories; do not update matched categories",
    )
    args = parser.parse_args()

    if not args.json_file.exists():
        print(f"Category JSON not found: {args.json_file}")
        sys.exit(1)

    stats = await import_categories(
        args.json_file,
        dry_run=args.dry_run,
        update_existing=not args.no_update_existing,
    )
    suffix = " (dry-run, no writes)" if args.dry_run else ""
    print(
        f"\nDone: {stats['added']} added, {stats['updated']} updated, "
        f"{stats['skipped']} unchanged{suffix}"
    )


if __name__ == "__main__":
    asyncio.run(main())
