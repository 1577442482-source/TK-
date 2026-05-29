"""Scrape TikTok using user's Chrome profile to get comments with login state."""
import os
import json
import sys

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

CHROME_PROFILE = os.path.expanduser("~/Library/Application Support/Google/Chrome")

# Use a separate profile dir to avoid locking issues
# Just connect to Chrome's actual user data so we get cookies
with sync_playwright() as p:
    browser = p.chromium.launch_persistent_context(
        user_data_dir=CHROME_PROFILE,
        headless=True,
        channel=None,  # Use Playwright's Chromium with Chrome's profile
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        locale="en-US",
        viewport={"width": 1920, "height": 1080},
        **(proxy and {"proxy": proxy} or {}),
    )

    page = browser.pages[0] if browser.pages else browser.new_page()
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    """)

    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.tiktok.com/@trailbossking22/video/7605457404053998862"
    print(f"Fetching: {url}")

    comment_responses = []

    def handle_response(response):
        url_lower = response.url.lower()
        if response.status == 200 and "comment" in url_lower and "list" in url_lower:
            try:
                comment_responses.append(response.json())
                print(f"Comment API: {response.url[:150]}")
            except:
                pass

    page.on("response", handle_response)

    page.goto(url, timeout=60000, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)

    # Try to click comment section to trigger loading
    page.evaluate("""
        (() => {
            const all = document.querySelectorAll('[class*="comment"], [class*="Comment"], button');
            for (const el of all) {
                const text = el.textContent || '';
                if (text.match(/\\d/) && el.tagName === 'BUTTON') {
                    el.click();
                    return 'clicked: ' + text.trim().substring(0, 20);
                }
            }
            return 'no button found';
        })()
    """)
    page.wait_for_timeout(5000)

    # Extract from embedded JSON
    udata = page.evaluate("document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__')?.textContent")
    if udata:
        data = json.loads(udata)
        default = data.get("__DEFAULT_SCOPE__", data)
        video_detail = default.get("webapp.video-detail", {})
        item_info = video_detail.get("itemInfo", {})
        item_struct = item_info.get("itemStruct", {})
        stats = item_struct.get("stats", item_struct.get("statsV2", {}))
        print(f"Video: {item_struct.get('desc', '')[:60]}")
        print(f"Stats: views={stats.get('playCount')}, likes={stats.get('diggCount')}, comments={stats.get('commentCount')}")

    # Comment API responses
    print(f"\nComment API responses: {len(comment_responses)}")
    for resp in comment_responses:
        cmts = resp.get("comments", [])
        print(f"  Comments: {len(cmts)}")
        for c in cmts[:5]:
            text = c.get("text", c.get("content", ""))
            user = c.get("user", {})
            uname = user.get("unique_id", user.get("nickname", ""))
            print(f"  - [{uname}] {text[:100]}")

    browser.close()
