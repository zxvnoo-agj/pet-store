import asyncio
import json
import httpx

API_BASE = "http://localhost:8001/v1"


async def test_product_detail(product_id: int):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/products/{product_id}")
        resp.raise_for_status()
        data = resp.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))

        product = data.get("data", {}).get("product", {})
        print("\n=== Fields present ===")
        for k, v in product.items():
            if v is not None and v != [] and v != {} and v != "":
                print(f"  {k}: {type(v).__name__} = {v}")


if __name__ == "__main__":
    import sys
    pid = int(sys.argv[1]) if len(sys.argv) > 1 else 115
    asyncio.run(test_product_detail(pid))
