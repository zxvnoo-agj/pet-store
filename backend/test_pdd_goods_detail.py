import asyncio
import json
import sys

from app.services.pdd_client import PDDClient


async def call_pdd_goods_detail(goods_id: str, access_token: str = ""):
    pdd = PDDClient()
    params = {
        "type": "pdd.goods.detail.get",
        "client_id": pdd.client_id,
        "timestamp": str(int(__import__("time").time())),
        "data_type": "JSON",
        "version": "V1",
        "goods_id": goods_id,
    }
    if access_token:
        params["access_token"] = access_token

    params["sign"] = pdd._sign(params)

    async with __import__("httpx").AsyncClient() as http:
        resp = await http.post("https://gw-api.pinduoduo.com/api/router", data=params)
        result = resp.json()

    error = result.get("error_response")
    if error:
        print(f"API Error: {json.dumps(error, ensure_ascii=False, indent=2)}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    gid = sys.argv[1] if len(sys.argv) > 1 else "804679740084"
    token = sys.argv[2] if len(sys.argv) > 2 else ""
    asyncio.run(call_pdd_goods_detail(gid, token))
