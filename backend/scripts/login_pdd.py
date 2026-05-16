"""
PDD 登录 + Cookie 导出脚本
1. 打开浏览器
2. 你手动登录
3. 自动导出 Cookie → pdd_cookies.json
4. 浏览器可关闭（Cookie 已持久化到文件）
5. 爬虫用 httpx + cookies 直接请求，无需 Playwright

用法: ./venv/bin/python scripts/login_pdd.py [goods_id]
"""
import asyncio
import json
import signal
import sys
from pathlib import Path

COOKIE_PATH = Path(__file__).resolve().parent.parent / "pdd_cookies.json"
PROFILE_DIR = Path(__file__).resolve().parent.parent / "pdd_profile"
GOODS_ID = sys.argv[1] if len(sys.argv) > 1 else "611277819187"
CDP_PORT = 9222
START_URL = "https://mobile.yangkeduo.com/goods.html?goods_id=%s" % GOODS_ID

running = True


async def main():
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        context = await pw.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--remote-debugging-port=%d" % CDP_PORT,
            ],
            viewport={"width": 390, "height": 844},
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 "
                "Mobile/15E148 Safari/604.1"
            ),
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
        )
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        """)

        page = await context.new_page()

        print("=== 浏览器已打开（profile: %s）===" % PROFILE_DIR)
        print("=== 请登录拼多多 ===")
        print("=== 登录后将自动导出 Cookie 到 %s ===" % COOKIE_PATH)
        print("=== 导出后浏览器可关闭 ===")
        print("=== 按 Ctrl+C 停止 ===")
        print()

        await page.goto(START_URL, wait_until="domcontentloaded", timeout=60000)

        logged_in = False
        poll = 0
        while running:
            if not logged_in:
                try:
                    data = await page.evaluate("() => window.rawData")
                    if data and isinstance(data, dict):
                        store = data.get("store")
                        need_login = (
                            isinstance(store, dict)
                            and store.get("initDataObj", {}).get("needLogin")
                        )
                        if not need_login and data.get("goodsInfo"):
                            logged_in = True
                            goods_name = (data.get("goodsInfo", {}) or {}).get("goodsName", "")

                            # 导出 Cookie
                            cookies = await context.cookies()
                            pdd_cookies = {}
                            for c in cookies:
                                domain = c.get("domain", "")
                                if any(
                                    d in domain
                                    for d in (".yangkeduo.com", ".pinduoduo.com", "yangkeduo.com")
                                ):
                                    pdd_cookies[c["name"]] = c["value"]

                            ua = await page.evaluate("() => navigator.userAgent")
                            with open(COOKIE_PATH, "w") as f:
                                json.dump({"cookies": pdd_cookies, "user_agent": ua}, f)

                            print()
                            print("=== 登录成功！===")
                            print("   商品: %s" % goods_name[:60])
                            print("   Cookie 已导出: %s (%d cookies)" % (COOKIE_PATH, len(pdd_cookies)))
                            print("=== 浏览器可安全关闭，Cookie 已持久化 ===")
                            print()
                except Exception:
                    pass
                poll += 1
                if poll % 10 == 0:
                    print("  等待登录中... (%ds)" % poll)
            await asyncio.sleep(1)


def shutdown():
    global running
    running = False
    print("\n正在关闭浏览器...")


if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda s, f: shutdown())
    signal.signal(signal.SIGTERM, lambda s, f: shutdown())
    asyncio.run(main())
