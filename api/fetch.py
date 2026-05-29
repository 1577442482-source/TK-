"""Vercel serverless function — TikTok SSR JSON parser.

Fetches TikTok video data from the embedded __UNIVERSAL_DATA_FOR_REHYDRATION__
JSON on any video page. Runs on Vercel servers (outside GFW), so no proxy needed.
"""

import json
import re
import ssl
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

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

    author = item.get("author", {}) or {}
    stats = item.get("stats", {}) or {}
    video = item.get("video", {}) or {}
    music = item.get("music", {}) or {}

    result = {
        "url": url,
        "description": desc,
        "creatorHandle": (author.get("uniqueId", "") or author.get("nickname", "") or "").replace("@", ""),
        "hashtags": hashtags,
        "duration": int(video.get("duration", 0) or 0),
        "views": int(stats.get("playCount", 0) or 0),
        "likes": int(stats.get("diggCount", 0) or 0),
        "shares": int(stats.get("shareCount", 0) or 0),
        "comments": int(stats.get("commentCount", 0) or 0),
        "saves": int(stats.get("collectCount", 0) or 0),
        "thumbnailUrl": video.get("cover", "") or video.get("originCover", "") or "",
        "commentsList": [],
    }

    if author.get("verified"):
        result["creatorVerified"] = author.get("verified")
    if author.get("signature"):
        result["creatorBio"] = author.get("signature")
    if author.get("avatarLarger"):
        result["creatorAvatar"] = author.get("avatarLarger")
    if music.get("title"):
        result["musicTitle"] = music["title"]
    if music.get("authorName"):
        result["musicAuthor"] = music["authorName"]
    if music.get("original"):
        result["musicOriginal"] = music.get("original")
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


def _cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json; charset=utf-8",
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in _cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        url = (params.get("url", [""])[0] or "").strip()

        if not url:
            self._json(400, {"success": False, "error": "Missing ?url= parameter"})
            return

        try:
            data = self._fetch(url)
            if data:
                self._json(200, {"success": True, "data": data})
            else:
                self._json(502, {"success": False, "error": "Failed to extract video data"})
        except Exception as e:
            self._json(502, {"success": False, "error": str(e)})

    def _json(self, status: int, body: dict):
        self.send_response(status)
        for k, v in _cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body, ensure_ascii=False).encode())

    def _fetch(self, url: str) -> dict | None:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with httpx.Client(
            timeout=httpx.Timeout(15.0),
            follow_redirects=True,
            headers={"User-Agent": BROWSER_UA},
            verify=False,
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()

        html = resp.text
        match = _SSR_RE.search(html)
        if not match:
            return None

        data = json.loads(match.group(1).strip())
        item = (
            data.get("__DEFAULT_SCOPE__", {})
            .get("webapp.video-detail", {})
            .get("itemInfo", {})
            .get("itemStruct")
        )
        if not item:
            return None

        return _map_ssr_to_response(item, url)
