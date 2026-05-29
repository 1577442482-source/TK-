"""Open TikTok main page for login. Auto-detects login and saves session."""
import os
import json
import time

STATE_FILE = os.path.join(os.path.dirname(__file__), "tiktok_state.json")

# Detect proxy
PROXY_DEFAULTS = ["127.0.0.1:7890", "127.0.0.1:7897", "127.0.0.1:1087", "127.0.0.1:10809"]
proxy = None
for host in PROXY_DEFAULTS:
    try:
        import urllib.request
        urllib.request.urlopen(f"http://{host}", timeout=1)
        proxy = {"server": f"http://{host}"}
        print(f"Proxy: {host}")
        break
    except Exception:
        continue

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    storage_state = STATE_FILE if os.path.exists(STATE_FILE) else None

    browser = p.chromium.launch(
        headless=False,
        args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        **(proxy and {"proxy": proxy} or {}),
    )

    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        locale="en-US",
        viewport={"width": 1920, "height": 1080},
        storage_state=storage_state,
    )

    page = context.new_page()
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
    """)

    print("\n" + "=" * 55)
    print("浏览器已打开，请完成 TikTok 登录：")
    print("  1. 点右上角 'Log in' 按钮")
    print("  2. 用任意方式登录（邮箱/手机/Google等）")
    print("  3. 登录成功后会自动检测并保存")
    print("=" * 55 + "\n")

    page.goto("https://www.tiktok.com/", timeout=30000, wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Auto-detect login by polling for sessionid cookie
    print("等待登录...（自动检测，无需按回车）")
    logged_in = False
    for _ in range(120):  # Wait up to 4 minutes
        time.sleep(2)
        cookies = context.cookies()
        session_cookies = [c for c in cookies if 'sessionid' in c['name'].lower()]
        if session_cookies:
            print(f"\n检测到登录成功！session cookie: {session_cookies[0]['name']}")
            logged_in = True
            break
        if _ % 15 == 0 and _ > 0:
            print(f"  已等待 {_*2} 秒... 当前 {len(cookies)} 个cookies")

    if logged_in:
        context.storage_state(path=STATE_FILE)
        all_cookies = context.cookies()
        print(f"\n会话已保存: {len(all_cookies)} cookies")
        for c in all_cookies:
            if 'session' in c['name'].lower() or 'auth' in c['name'].lower():
                print(f"  {c['name']} domain={c['domain']}")
    else:
        # Save whatever we have anyway
        context.storage_state(path=STATE_FILE)
        all_cookies = context.cookies()
        print(f"\n超时未检测到登录。已保存当前 {len(all_cookies)} cookies")
        print("提示：如果登录页面没正常显示，可能是TikTok检测到了自动化浏览器")

    browser.close()
