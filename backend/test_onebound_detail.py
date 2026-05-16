import requests

API_KEY = "t8858177223"
API_SECRET = "7223ba46"


def test_onebound_detail(num_iid: str):
    url = f"https://api-gw.onebound.cn/pinduoduo/item_get_app_pro/?key={API_KEY}&secret={API_SECRET}&num_iid={num_iid}"
    headers = {"Accept-Encoding": "gzip", "Connection": "close"}

    r = requests.get(url, headers=headers)
    json_obj = r.json()
    print(f"num_iid={num_iid}:")
    import json
    print(json.dumps(json_obj, ensure_ascii=False, indent=2))
    print()
    return json_obj


if __name__ == "__main__":
    import sys
    nid = sys.argv[1] if len(sys.argv) > 1 else "804679740084"
    # Try multiple IDs to see which works
    test_onebound_detail(nid)
