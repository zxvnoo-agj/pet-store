#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
鲜朗猫粮全系列产品SPU导入脚本
从鲜朗猫粮_spus.json读取SPU数据并导入数据库
基于import_royal_canin.py修改
"""

import json
import requests
from datetime import UTC, datetime, timedelta
from jose import jwt

# Configuration
BASE_URL = "http://localhost:8001/v1/admin/goods"
SECRET_KEY = "change-me-in-production"
ADMIN_USER_ID = "1"

# Generate admin token
token = jwt.encode(
    {"sub": ADMIN_USER_ID, "exp": datetime.now(UTC) + timedelta(days=7)},
    SECRET_KEY,
    algorithm="HS256",
)

HEADERS = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}


def load_products():
    """Load products from JSON file"""
    input_file = "/home/zxv/code/pet-store/鲜朗猫粮_spus.json"
    with open(input_file, "r", encoding="utf-8") as f:
        products = json.load(f)
    print(f"Loaded {len(products)} products from {input_file}")
    return products


def import_to_database():
    """Import products to database via API"""
    products = load_products()
    url = f"{BASE_URL}/spus"
    success_count = 0
    failed_count = 0
    failed_items = []

    for i, product in enumerate(products):
        try:
            response = requests.post(url, json=product, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                success_count += 1
                print(f"[{i+1}/{len(products)}] Created: {product['name']}")
            elif response.status_code == 409:
                failed_count += 1
                print(f"[{i+1}/{len(products)}] Already exists (409): {product['name']}")
                failed_items.append({"name": product["name"], "status": 409, "error": "Duplicate"})
            else:
                failed_count += 1
                error_text = response.text[:200]
                print(f"[{i+1}/{len(products)}] Failed ({response.status_code}): {product['name']} - {error_text}")
                failed_items.append({"name": product["name"], "status": response.status_code, "error": error_text})
        except Exception as e:
            failed_count += 1
            print(f"[{i+1}/{len(products)}] Error: {product['name']} - {str(e)}")
            failed_items.append({"name": product["name"], "status": "exception", "error": str(e)})

    print(f"\nImport Summary:")
    print(f"  Total: {len(products)}")
    print(f"  Success: {success_count}")
    print(f"  Failed: {failed_count}")

    if failed_items:
        print(f"\nFailed items:")
        for item in failed_items:
            print(f"  - {item['name']}: {item['status']} - {item['error']}")


if __name__ == "__main__":
    print("Importing 鲜朗猫粮 products to database...")
    import_to_database()
