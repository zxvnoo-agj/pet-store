"""
Dump 登录态下 PDD 商品页的 window.rawData 结构
通过 CDP 连接到 login_pdd.py 的运行中浏览器（共享 profile/cookie）
用法: ./venv/bin/python scripts/dump_rawdata.py GOODS_ID [share_url]
"""
import asyncio
import json
import sys
from pathlib import Path

GOODS_ID = sys.argv[1] if len(sys.argv) > 1 else "611277819187"
SHARE_URL = sys.argv[2] if len(sys.argv) > 2 else ""
CDP_PORT = 9222


async def main():
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        cdp_url = "http://localhost:%d" % CDP_PORT
        print("[dump] Connecting to running browser at %s" % cdp_url)

        browser = await pw.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        print("[dump] Using browser context (persistent profile from login_pdd.py)")

        page = await context.new_page()

        target_url = SHARE_URL or "https://mobile.yangkeduo.com/goods.html?goods_id=%s" % GOODS_ID
        print("[dump] Navigating to %s" % target_url[:150])

        await page.route("**/*", lambda route: (
            route.abort() if route.request.resource_type in ("image", "media", "font", "stylesheet")
            else route.continue_()
        ))

        await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)

        # 等待页面稳定
        await page.wait_for_timeout(2000)

        if "login" in page.url.lower():
            print("[dump] Redirected to login page — login_pdd.py may not be logged in yet")
            # 保存 HTML 用于调试
            html = await page.content()
            with open("/tmp/pdd_debug.html", "w") as f:
                f.write(html)
            print("[dump] Saved HTML to /tmp/pdd_debug.html")
            await page.close()
            return

        data = None
        for i in range(10):
            try:
                data = await page.evaluate("() => window.rawData")
                if data:
                    print("[dump] window.rawData found after %ds" % (i + 1))
                    break
            except Exception as e:
                print("[dump] Context lost, waiting for page to settle... (%s)" % str(e)[:60])
                await page.wait_for_timeout(2000)
                if "login" in page.url.lower():
                    print("[dump] Redirected to login, auth invalid")
                    break
            await page.wait_for_timeout(1000)

        if not data:
            print("[dump] window.rawData is null/undefined")
            try:
                data = await page.evaluate("() => window.__INITIAL_STATE__")
                if data:
                    print("[dump] Using window.__INITIAL_STATE__ instead")
            except Exception:
                html = await page.content()
                with open("/tmp/pdd_debug.html", "w") as f:
                    f.write(html)
                print("[dump] Saved HTML to /tmp/pdd_debug.html")
                await page.close()
                return

        print("\n=== Top-level keys (%d) ===" % len(data))
        for k, v in data.items():
            t = type(v).__name__
            if isinstance(v, dict):
                print("  %s: dict(%d keys)" % (k, len(v)))
                subs = list(v.keys())[:8]
                for sk in subs:
                    sv = v[sk]
                    st = type(sv).__name__
                    if isinstance(sv, (dict, list)):
                        print("    %s: %s(len=%d)" % (sk, st, len(sv)))
                    else:
                        print("    %s: %s = %s" % (sk, st, str(sv)[:80]))
                if len(v) > 8:
                    print("    ... +%d more keys" % (len(v) - 8))
            elif isinstance(v, list):
                print("  %s: list(len=%d)" % (k, len(v)))
                if v and isinstance(v[0], dict):
                    print("    sample keys: %s" % list(v[0].keys())[:6])
            else:
                print("  %s: %s = %s" % (k, t, str(v)[:80]))

        print("\n=== Image-related fields ===")
        for section_name, section in data.items():
            if isinstance(section, dict):
                for sk, sv in section.items():
                    if any(kw in sk.lower() for kw in ("gallery", "image", "img", "picture", "detail", "banner")):
                        print("  %s.%s: %s" % (section_name, sk, str(sv)[:200]))

        out_path = Path("/tmp/pdd_rawdata_%s.json" % GOODS_ID)
        with open(out_path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("\nFull dump saved to %s" % out_path)
        print("Size: %d bytes" % out_path.stat().st_size)

        await page.close()
        print("[dump] Done. login_pdd.py browser still running.")


if __name__ == "__main__":
    asyncio.run(main())
