import asyncio
import json
import sys
from app.services.pdd_client import PDDClient


async def test_all_three(keyword: str = "皇家猫粮", goods_sign_override: str | None = None):
    pdd = PDDClient()
    try:
        # ── 1. pdd.ddk.goods.search ──
        print("=" * 60)
        print("1. pdd.ddk.goods.search")
        print(f"   keyword: {keyword}")
        print("=" * 60)
        goods_list = await pdd.search_goods(keyword, page=1, page_size=10)
        print(json.dumps(goods_list, ensure_ascii=False, indent=2))
        print(f"\n   → Found {len(goods_list)} goods\n")

        if not goods_list and not goods_sign_override:
            print("No goods found and no goods_sign provided, aborting.")
            return

        # Pick goods_sign
        goods_sign = goods_sign_override
        if not goods_sign and goods_list:
            goods_sign = goods_list[0].get("goods_sign")
        if not goods_sign:
            print("No goods_sign available, aborting.")
            return

        print(f"   Using goods_sign: {goods_sign}")
        print()

        # ── 2. pdd.ddk.goods.detail ──
        print("=" * 60)
        print("2. pdd.ddk.goods.detail")
        print(f"   goods_sign: {goods_sign}")
        print("=" * 60)
        detail = await pdd.get_goods_detail(goods_sign)
        if detail:
            print(json.dumps(detail, ensure_ascii=False, indent=2))
            print("\n   → parse_goods output:")
            parsed = pdd.parse_goods(detail)
            print(json.dumps(parsed, ensure_ascii=False, indent=2))
        else:
            print("   (no detail returned)")
        print()

        # ── 3. pdd.ddk.goods.promotion.url.generate ──
        print("=" * 60)
        print("3. pdd.ddk.goods.promotion.url.generate")
        print(f"   goods_sign: {goods_sign}")
        print(f"   pid: {pdd.pid}")
        print("=" * 60)
        promo = await pdd.generate_promotion_url(goods_sign, pdd.pid)
        print(json.dumps(promo, ensure_ascii=False, indent=2))
        print()

    finally:
        await pdd.close()


if __name__ == "__main__":
    kw = sys.argv[1] if len(sys.argv) > 1 else "皇家猫粮"
    gs = sys.argv[2] if len(sys.argv) > 2 else None
    asyncio.run(test_all_three(kw, gs))
