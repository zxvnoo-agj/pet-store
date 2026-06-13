#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.category import Category


NEW_CATEGORIES = [
    # ===== 猫 =====
    # 猫粮 (13) + 干粮(15) 湿粮(16) 已存在

    # 猫砂
    {"name": "猫砂", "pet_type": "cat", "parent_name": None, "level": 1, "sort_order": 2},
    {"name": "豆腐砂", "pet_type": "cat", "parent_name": "猫砂", "level": 2, "sort_order": 1},
    {"name": "膨润土砂", "pet_type": "cat", "parent_name": "猫砂", "level": 2, "sort_order": 2},
    {"name": "混合砂", "pet_type": "cat", "parent_name": "猫砂", "level": 2, "sort_order": 3},

    # 猫玩具
    {"name": "猫玩具", "pet_type": "cat", "parent_name": None, "level": 1, "sort_order": 3},
    {"name": "逗猫棒", "pet_type": "cat", "parent_name": "猫玩具", "level": 2, "sort_order": 1},
    {"name": "猫抓板", "pet_type": "cat", "parent_name": "猫玩具", "level": 2, "sort_order": 2},
    {"name": "猫爬架", "pet_type": "cat", "parent_name": "猫玩具", "level": 2, "sort_order": 3},

    # 猫用品
    {"name": "猫用品", "pet_type": "cat", "parent_name": None, "level": 1, "sort_order": 4},
    {"name": "猫碗", "pet_type": "cat", "parent_name": "猫用品", "level": 2, "sort_order": 1},
    {"name": "猫窝", "pet_type": "cat", "parent_name": "猫用品", "level": 2, "sort_order": 2},
    {"name": "猫包", "pet_type": "cat", "parent_name": "猫用品", "level": 2, "sort_order": 3},
    {"name": "猫梳子", "pet_type": "cat", "parent_name": "猫用品", "level": 2, "sort_order": 4},

    # ===== 狗 =====
    # 狗粮 (14) + 干粮(17) 湿粮(18) 已存在

    # 狗零食
    {"name": "狗零食", "pet_type": "dog", "parent_name": None, "level": 1, "sort_order": 3},
    {"name": "肉干", "pet_type": "dog", "parent_name": "狗零食", "level": 2, "sort_order": 1},
    {"name": "磨牙棒", "pet_type": "dog", "parent_name": "狗零食", "level": 2, "sort_order": 2},

    # 狗玩具
    {"name": "狗玩具", "pet_type": "dog", "parent_name": None, "level": 1, "sort_order": 4},
    {"name": "磨牙玩具", "pet_type": "dog", "parent_name": "狗玩具", "level": 2, "sort_order": 1},
    {"name": "互动玩具", "pet_type": "dog", "parent_name": "狗玩具", "level": 2, "sort_order": 2},
    {"name": "发声玩具", "pet_type": "dog", "parent_name": "狗玩具", "level": 2, "sort_order": 3},

    # 狗用品
    {"name": "狗用品", "pet_type": "dog", "parent_name": None, "level": 1, "sort_order": 5},
    {"name": "牵引绳", "pet_type": "dog", "parent_name": "狗用品", "level": 2, "sort_order": 1},
    {"name": "狗窝", "pet_type": "dog", "parent_name": "狗用品", "level": 2, "sort_order": 2},
    {"name": "狗碗", "pet_type": "dog", "parent_name": "狗用品", "level": 2, "sort_order": 3},
    {"name": "狗梳子", "pet_type": "dog", "parent_name": "狗用品", "level": 2, "sort_order": 4},
]


async def main():
    async with AsyncSessionLocal() as session:
        # Fetch existing categories into a lookup
        result = await session.execute(select(Category))
        existing = result.scalars().all()
        name_to_cat = {}
        for c in existing:
            name_to_cat[(c.pet_type, c.name)] = c

        # Insert parent categories first, then children
        parents_first = sorted(NEW_CATEGORIES, key=lambda x: x["level"])

        added = 0
        skipped = 0
        for item in parents_first:
            key = (item["pet_type"], item["name"])
            if key in name_to_cat:
                skipped += 1
                continue

            parent_id = None
            if item["parent_name"]:
                parent_key = (item["pet_type"], item["parent_name"])
                parent = name_to_cat.get(parent_key)
                if parent:
                    parent_id = parent.id

            cat = Category(
                name=item["name"],
                pet_type=item["pet_type"],
                parent_id=parent_id,
                level=item["level"],
                sort_order=item["sort_order"],
            )
            session.add(cat)
            await session.flush()
            name_to_cat[key] = cat
            added += 1
            print(f"  + [{cat.id}] {item['pet_type']} / {item['name']}")

        await session.commit()
        print(f"\nDone: {added} added, {skipped} skipped (already exist)")


if __name__ == "__main__":
    asyncio.run(main())
