import asyncio
import json
import sys
from app.services.pdd_client import PDDClient


async def test_detail(goods_sign: str):
    pdd = PDDClient()
    try:
        detail = await pdd.get_goods_detail(goods_sign)
        print(json.dumps(detail, ensure_ascii=False, indent=2))

        if not detail:
            print("\n⚠️ No detail data returned")
            return

        print("\n=== parse_goods output ===")
        parsed = pdd.parse_goods(detail)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))

    finally:
        await pdd.close()


if __name__ == "__main__":
    gs = sys.argv[1] if len(sys.argv) > 1 else "E9z2fuRej6xt2X6xwfDAO7ybeKrl7q4VEA_JQEXyOS80C"
    asyncio.run(test_detail(gs))
