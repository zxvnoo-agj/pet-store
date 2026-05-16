import asyncio
import json
from app.services.pdd_client import PDDClient


async def test_pdd_detail(goods_sign: str):
    pdd = PDDClient()
    try:
        detail = await pdd.get_goods_detail(goods_sign)
        print(json.dumps(detail, ensure_ascii=False, indent=2))

        if detail:
            parsed = pdd.parse_goods(detail)
            print("\n=== parse_goods output ===")
            print(json.dumps(parsed, ensure_ascii=False, indent=2))
    finally:
        await pdd.close()


if __name__ == "__main__":
    import sys
    gs = sys.argv[1] if len(sys.argv) > 1 else "E9L2GTDolCBt2X6xwfDAJNxyq6PeBcP9nQ_JSTecQy6o"
    asyncio.run(test_pdd_detail(gs))
