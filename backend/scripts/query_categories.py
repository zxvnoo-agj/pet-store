#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models.category import Category


async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Category)
            .options(selectinload(Category.children))
            .order_by(Category.pet_type, Category.sort_order, Category.id)
        )
        categories = result.scalars().all()

        by_pet = {}
        for cat in categories:
            by_pet.setdefault(cat.pet_type, []).append(cat)

        for pet_type, cats in by_pet.items():
            print(f"\n{'='*40}")
            print(f"  pet_type = {pet_type}")
            print(f"{'='*40}")
            for cat in cats:
                if cat.parent_id is None:
                    print(f"  [{cat.id}] {cat.name} (level={cat.level}, sort={cat.sort_order})")
                    for child in sorted(cat.children, key=lambda c: c.sort_order):
                        print(f"    ├── [{child.id}] {child.name} (sort={child.sort_order})")
            print()

        print(f"Total: {len(categories)} categories")


if __name__ == "__main__":
    asyncio.run(main())
