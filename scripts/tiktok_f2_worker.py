"""TikTok video metadata fetcher via SSR JSON parsing.

TikTok embeds all video data in <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">
in every video page for SEO/SSR. This approach requires no API keys, no cookies,
no authentication — just an HTTP GET with a browser User-Agent.

Usage: python3 tiktok_f2_worker.py <tiktok_url> [--proxy http://127.0.0.1:7890]
Output: JSON on stdout
"""

import argparse
import json
import re
import ssl
import sys
import traceback
from datetime import datetime
from urllib.parse import urlparse

import httpx

_VIDEO_ID_RE = re.compile(r"video/(\d+)")
_SSR_RE = re.compile(
    r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">\s*(.*?)\s*</script>',
    re.DOTALL,
)

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)


def _extract_video_id(url: str) -> str:
    match = _VIDEO_ID_RE.search(url)
    if match:
        return match.group(1)
    raise ValueError(f"Cannot extract video ID from URL: {url}")


def _extract_hashtags_from_text(text: str) -> list[str]:
    seen = set()
    result = []
    for t in re.findall(r"#(\w+)", text):
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


def _map_ssr_to_response(item: dict, url: str) -> dict:
    desc = item.get("desc", "") or ""

    # Hashtags: challenges + textExtra + text parse
    hashtags: list[str] = []
    for c in item.get("challenges", []) or []:
        title = c.get("title", "")
        if title and title not in hashtags:
            hashtags.append(str(title))
    for te in item.get("textExtra", []) or []:
        tag = te.get("hashtagName", "") if isinstance(te, dict) else str(te)
        if tag and tag not in hashtags:
            hashtags.append(tag)
    for t in _extract_hashtags_from_text(desc):
        if t not in hashtags:
            hashtags.append(t)

    # Author
    author = item.get("author", {}) or {}
    creator_handle = author.get("uniqueId", "") or author.get("nickname", "") or ""

    # Stats
    stats = item.get("stats", {}) or {}
    views = int(stats.get("playCount", 0) or 0)
    likes = int(stats.get("diggCount", 0) or 0)
    shares = int(stats.get("shareCount", 0) or 0)
    comments = int(stats.get("commentCount", 0) or 0)
    saves = int(stats.get("collectCount", 0) or 0)

    # Video info
    video = item.get("video", {}) or {}
    duration = int(video.get("duration", 0) or 0)
    thumbnail = video.get("cover", "") or video.get("originCover", "") or ""

    # Timestamp
    posted_at = ""
    create_time = item.get("createTime", "")
    if create_time:
        try:
            posted_at = datetime.fromtimestamp(
                int(create_time) if isinstance(create_time, str) else create_time
            ).isoformat()
        except Exception:
            posted_at = str(create_time)

    result = {
        "url": url,
        "description": desc,
        "creatorHandle": creator_handle.replace("@", ""),
        "hashtags": hashtags,
        "duration": duration,
        "views": views,
        "likes": likes,
        "shares": shares,
        "comments": comments,
        "saves": saves,
        "thumbnailUrl": thumbnail,
        "commentsList": [],
    }

    if posted_at:
        result["postedAt"] = posted_at

    # Music
    music = item.get("music", {}) or {}
    if music.get("title"):
        result["musicTitle"] = music["title"]
    if music.get("authorName"):
        result["musicAuthor"] = music["authorName"]
    if music.get("original"):
        result["musicOriginal"] = music["original"]

    # Author details
    if author.get("verified"):
        result["creatorVerified"] = author.get("verified")
    if author.get("signature"):
        result["creatorBio"] = author.get("signature")
    if author.get("avatarLarger"):
        result["creatorAvatar"] = author.get("avatarLarger")

    # Video details
    if video.get("width"):
        result["videoWidth"] = int(video["width"])
    if video.get("height"):
        result["videoHeight"] = int(video["height"])
    if video.get("dynamicCover"):
        result["dynamicCover"] = video["dynamicCover"]
    if video.get("playAddr"):
        result["videoDownloadUrl"] = video["playAddr"]
    if video.get("downloadAddr"):
        result["videoDownloadUrl"] = video["downloadAddr"]

    return result


def fetch_tiktok_video(url: str, proxy: str | None = None) -> dict | None:
    proxies = None
    if proxy:
        proxies = {"http://": proxy, "https://": proxy}

    with httpx.Client(
        timeout=httpx.Timeout(30.0),
        follow_redirects=True,
        proxy=proxy,
        headers={"User-Agent": BROWSER_UA},
        verify=False,
    ) as client:
        response = client.get(url)
        response.raise_for_status()

    html = response.text

    match = _SSR_RE.search(html)
    if not match:
        sys.stderr.write(f"[worker] SSR JSON not found in page ({len(html)} bytes)\n")
        return None

    try:
        data = json.loads(match.group(1).strip())
    except json.JSONDecodeError as e:
        sys.stderr.write(f"[worker] SSR JSON parse error: {e}\n")
        return None

    item = (
        data.get("__DEFAULT_SCOPE__", {})
        .get("webapp.video-detail", {})
        .get("itemInfo", {})
        .get("itemStruct")
    )
    if not item:
        sys.stderr.write("[worker] itemStruct not found in SSR data\n")
        return None

    return _map_ssr_to_response(item, url)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("url", help="TikTok video URL")
    parser.add_argument("--proxy", help="Proxy URL (e.g. http://127.0.0.1:7890)")
    args = parser.parse_args()

    try:
        data = fetch_tiktok_video(args.url, args.proxy)
        if data:
            print(json.dumps({"success": True, "data": data}, ensure_ascii=False))
        else:
            print(json.dumps({"success": False, "error": "No data returned"}, ensure_ascii=False))
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
