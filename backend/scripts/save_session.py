"""
手动 Cookie 导出 — 从运行中的浏览器导出 Cookie
当 login_pdd.py 的自动导出失败时的备用方案

用法: ./venv/bin/python scripts/save_session.py
要求: 浏览器运行中（含已登录的 PDD 页面）
"""
import asyncio
import json
from pathlib import Path

COOKIE_PATH = Path(__file__).resolve().parent.parent / "pdd_cookies.json"
CDP_PORT = 9222


async def main():
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        cdp_url = "http://localhost:%d" % CDP_PORT
        print("[save] Connecting to running browser at %s" % cdp_url)

        browser = await pw.chromium.connect_over_cdp(cdp_url)
        if not browser.contexts:
            print("[save] No contexts found")
            return

        context = browser.contexts[0]
        cookies = await context.cookies()

        pdd_cookies = {}
        for c in cookies:
            domain = c.get("domain", "")
            if any(d in domain for d in (".yangkeduo.com", ".pinduoduo.com", "yangkeduo.com")):
                pdd_cookies[c["name"]] = c["value"]

        ua = (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 "
            "Mobile/15E148 Safari/604.1"
        )
        try:
            page = await context.new_page()
            ua = await page.evaluate("() => navigator.userAgent") or ua
            await page.close()
        except Exception:
            pass

        with open(COOKIE_PATH, "w") as f:
            json.dump({"cookies": pdd_cookies, "user_agent": ua}, f)

        print("[save] Saved %d PDD cookies to %s" % (len(pdd_cookies), COOKIE_PATH))


if __name__ == "__main__":
    asyncio.run(main())
