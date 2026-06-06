#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 Orijen_products.json 读取 SPU 数据并导入数据库
"""

import json
import requests

BASE_URL = "http://localhost:8001/v1/admin/goods"

# Get a valid admin token via login
login_resp = requests.post(
    "http://localhost:8001/v1/admin/auth/login",
    json={"username": "admin", "password": "admin"},
    timeout=10,
)
login_resp.raise_for_status()
token = login_resp.json()["data"]["token"]

HEADERS = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}


def import_from_json(json_path: str):
    with open(json_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    url = f"{BASE_URL}/spus"
    success = 0
    skipped = 0
    failed = []

    for i, p in enumerate(products):
        try:
            resp = requests.post(url, json=p, headers=HEADERS, timeout=10)
            if resp.status_code == 200:
                success += 1
                print(f"[{i+1}/{len(products)}]  Created: {p['name']}")
            elif resp.status_code == 409:
                skipped += 1
                print(f"[{i+1}/{len(products)}]  Skip (exists): {p['name']}")
            else:
                failed.append((p["name"], resp.status_code, resp.text[:200]))
                print(f"[{i+1}/{len(products)}]  Fail ({resp.status_code}): {p['name']}")
        except Exception as e:
            failed.append((p["name"], "exception", str(e)))
            print(f"[{i+1}/{len(products)}]  Error: {p['name']} - {e}")

    print(f"\nDone. Total={len(products)}, Success={success}, Skipped={skipped}, Failed={len(failed)}")
    for name, code, msg in failed:
        print(f"  ! {name}: {code} - {msg}")


if __name__ == "__main__":
    import_from_json("/home/zxv/code/pet-store/Orijen_products.json")
