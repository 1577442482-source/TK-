"""TikTok data bridge — uses SSR JSON parsing (no API keys or login required)."""

import base64
import json
import os
import ssl
import subprocess
import sys
import tempfile
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

HOST = "127.0.0.1"
PORT = 8765

# Common proxy defaults
PROXY_DEFAULTS = [
    "127.0.0.1:7890",   # Clash
    "127.0.0.1:7897",   # Clash Meta
    "127.0.0.1:1087",   # V2Ray HTTP
    "127.0.0.1:10809",  # V2Ray
    "127.0.0.1:8080",
    "127.0.0.1:1086",
]

_proxy_config = None


def set_proxy(proxy_url: str):
    global _proxy_config
    _proxy_config = {"server": proxy_url}


def detect_proxy():
    import urllib.request
    import urllib.error
    for proxy_host in PROXY_DEFAULTS:
        try:
            url = f"http://{proxy_host}"
            req = urllib.request.Request(url, method="HEAD")
            urllib.request.urlopen(req, timeout=1)
            print(f"[tiktok-api] Detected proxy: {proxy_host}")
            return {"server": f"http://{proxy_host}"}
        except urllib.error.HTTPError:
            print(f"[tiktok-api] Detected proxy (non-2xx): {proxy_host}")
            return {"server": f"http://{proxy_host}"}
        except Exception:
            continue
    return None


# ============================================================
# SSR-based TikTok fetcher (runs in subprocess to avoid blocking
# the main server)
# ============================================================

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
F2_WORKER = os.path.join(SCRIPTS_DIR, "tiktok_f2_worker.py")


def _fetch_via_f2_subprocess(url: str, timeout: int = 30) -> dict | None:
    """Run tiktok_f2_worker.py as a subprocess with a timeout.
    Returns parsed data dict or None on failure."""
    cmd = [sys.executable, F2_WORKER, url]
    if _proxy_config:
        cmd.extend(["--proxy", _proxy_config["server"]])

    print(f"[tiktok-api] Running f2 worker: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            stderr = result.stderr.strip()
            print(f"[tiktok-api] f2 worker error (exit {result.returncode}): {stderr[:300]}")
            return None

        try:
            parsed = json.loads(result.stdout.strip())
        except json.JSONDecodeError:
            print(f"[tiktok-api] f2 worker returned non-JSON: {result.stdout[:200]}")
            return None

        if parsed.get("success") and parsed.get("data"):
            data = parsed["data"]
            print(f"[tiktok-api] f2 result: {data.get('views', 0)} views, {data.get('likes', 0)} likes")
            return data
        else:
            error = parsed.get("error", "Unknown error")
            print(f"[tiktok-api] f2 worker returned error: {error[:200]}")
            return None

    except subprocess.TimeoutExpired:
        print(f"[tiktok-api] f2 worker timed out after {timeout}s")
        return None
    except FileNotFoundError:
        print(f"[tiktok-api] f2 worker script not found at {F2_WORKER}")
        return None
    except Exception as e:
        print(f"[tiktok-api] f2 worker exception: {e}")
        return None


def fetch_tiktok_video(url: str) -> dict | None:
    """Fetch TikTok video data using f2 subprocess worker."""
    return _fetch_via_f2_subprocess(url)


# ============================================================
# Frame extraction
# ============================================================

def _best_video_url(formats: list) -> str:
    """Select best video+audio format URL from yt-dlp's formats list."""
    if not formats:
        return ""
    best_with_audio = None
    best_fallback = None
    for f in formats:
        url = f.get("url", "")
        if not url:
            continue
        has_video = f.get("vcodec", "none") != "none"
        has_audio = f.get("acodec", "none") != "none"
        height = f.get("height") or 0
        if has_video and has_audio:
            if best_with_audio is None or height > (best_with_audio.get("height") or 0):
                best_with_audio = f
        elif has_video and best_fallback is None:
            best_fallback = f
    chosen = best_with_audio or best_fallback
    return chosen.get("url", "") if chosen else ""


def _download_and_extract_frames(video_url: str, duration: float, num_frames: int = 10) -> list[dict]:
    """Download from a direct CDN URL and extract frames as base64 JPEG."""
    from imageio_ffmpeg import get_ffmpeg_exe
    ffmpeg = get_ffmpeg_exe()

    tmp_video = tempfile.mktemp(suffix=".mp4")
    tmp_dir = tempfile.mkdtemp()
    frames = []

    try:
        print(f"[tiktok-api] Downloading from CDN ({num_frames} frames, {duration}s)...")
        req = urllib.request.Request(video_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.tiktok.com/",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        })
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=120, context=ctx) as resp:
            with open(tmp_video, "wb") as f:
                f.write(resp.read())

        file_size = os.path.getsize(tmp_video)
        if file_size < 1000:
            print(f"[tiktok-api] Downloaded video too small: {file_size} bytes", file=sys.stderr)
            return []

        if duration <= 0:
            duration = 30

        num_frames = min(num_frames, max(3, int(duration * 2)))
        fps = max(0.1, min(num_frames / duration, 5))
        result = subprocess.run([
            ffmpeg, "-i", tmp_video,
            "-vf", f"fps={fps},scale=512:-1",
            "-q:v", "2",
            "-frames:v", str(num_frames),
            f"{tmp_dir}/frame_%03d.jpg",
        ], capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            print(f"[tiktok-api] ffmpeg error: {result.stderr[:300]}", file=sys.stderr)
            return []

        for fname in sorted(os.listdir(tmp_dir)):
            if fname.startswith("frame_") and fname.endswith(".jpg"):
                fpath = os.path.join(tmp_dir, fname)
                with open(fpath, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode()
                    frames.append({"base64": b64, "mimeType": "image/jpeg"})
                os.unlink(fpath)

        print(f"[tiktok-api] Extracted {len(frames)} frames from CDN download")
        return frames
    except Exception as e:
        print(f"[tiktok-api] CDN frame extraction failed: {e}", file=sys.stderr)
        return []
    finally:
        if os.path.exists(tmp_video):
            os.unlink(tmp_video)
        if os.path.exists(tmp_dir):
            try:
                os.rmdir(tmp_dir)
            except OSError:
                pass


def extract_video_frames(tiktok_url: str, duration: float, num_frames: int = 10) -> list[dict]:
    """Download TikTok video via yt-dlp and extract frames as base64 JPEG."""
    from imageio_ffmpeg import get_ffmpeg_exe
    ffmpeg = get_ffmpeg_exe()

    tmp_dir = tempfile.mkdtemp()
    frames = []

    try:
        print(f"[tiktok-api] Downloading video via yt-dlp ({num_frames} frames, {duration}s)...")
        import yt_dlp
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "outtmpl": f"{tmp_dir}/video.%(ext)s",
            "format": "best[ext=mp4]/best",
            "retries": 1,
            "socket_timeout": 30,
        }
        if _proxy_config:
            ydl_opts["proxy"] = _proxy_config["server"]

        tmp_video = None
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([tiktok_url])
        except Exception as e:
            print(f"[tiktok-api] yt-dlp download error: {e}", file=sys.stderr)
            return []

        for fname in os.listdir(tmp_dir):
            if fname.endswith((".mp4", ".webm", ".mkv")):
                tmp_video = os.path.join(tmp_dir, fname)
                break

        if not tmp_video or not os.path.exists(tmp_video):
            print("[tiktok-api] yt-dlp did not produce a video file", file=sys.stderr)
            return []

        file_size = os.path.getsize(tmp_video)
        if file_size < 1000:
            print(f"[tiktok-api] Downloaded video too small: {file_size} bytes", file=sys.stderr)
            return []

        print(f"[tiktok-api] Downloaded {file_size} bytes, extracting frames...")

        if duration <= 0:
            duration = 30

        num_frames = min(num_frames, max(3, int(duration * 2)))
        fps = max(0.1, min(num_frames / duration, 5))
        result = subprocess.run([
            ffmpeg, "-i", tmp_video,
            "-vf", f"fps={fps},scale=512:-1",
            "-q:v", "2",
            "-frames:v", str(num_frames),
            f"{tmp_dir}/frame_%03d.jpg",
        ], capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            print(f"[tiktok-api] ffmpeg error: {result.stderr[:300]}", file=sys.stderr)
            return []

        for fname in sorted(os.listdir(tmp_dir)):
            if fname.startswith("frame_") and fname.endswith(".jpg"):
                fpath = os.path.join(tmp_dir, fname)
                with open(fpath, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode()
                    frames.append({
                        "base64": b64,
                        "mimeType": "image/jpeg",
                    })
                os.unlink(fpath)

        print(f"[tiktok-api] Extracted {len(frames)} frames")
        return frames
    except Exception as e:
        print(f"[tiktok-api] Frame extraction failed: {e}", file=sys.stderr)
        return []
    finally:
        for fname in os.listdir(tmp_dir):
            try:
                os.unlink(os.path.join(tmp_dir, fname))
            except OSError:
                pass
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


# ============================================================
# HTTP Server
# ============================================================

class TikTokHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[api] {args[0]}")

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json({})

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == "/api/fetch":
            url_param = params.get("url", [None])[0]
            if not url_param:
                self._send_json({"error": "Missing ?url= parameter"}, 400)
                return

            try:
                data = fetch_tiktok_video(url_param)
                if data:
                    self._send_json({"success": True, "data": data})
                else:
                    self._send_json({"error": "No data found"}, 500)
            except Exception as e:
                msg = str(e)
                print(f"[tiktok-api] ERROR: {msg}", file=sys.stderr)
                self._send_json({"error": msg}, 500)

        elif parsed.path == "/api/extract-frames":
            url_param = params.get("url", [None])[0]
            download_url = params.get("downloadUrl", [None])[0]
            num_frames = int(params.get("frames", ["10"])[0])

            try:
                if download_url:
                    duration = float(params.get("duration", ["30"])[0])
                    frames = _download_and_extract_frames(download_url, duration, num_frames)
                elif url_param:
                    tiktok_url = url_param
                    vid_data = fetch_tiktok_video(url_param)
                    duration = vid_data.get("duration", 30) if vid_data else 30
                    frames = extract_video_frames(tiktok_url, duration, num_frames)
                else:
                    self._send_json({"error": "Missing ?url= or ?downloadUrl= parameter"}, 400)
                    return

                if not frames:
                    self._send_json({
                        "success": False,
                        "error": "Frame extraction produced no frames",
                    }, 500)
                    return

                self._send_json({"success": True, "frames": frames, "duration": duration})
            except Exception as e:
                msg = str(e)
                print(f"[tiktok-api] Extract frames ERROR: {msg}", file=sys.stderr)
                self._send_json({"error": msg}, 500)

        elif parsed.path == "/health":
            self._send_json({"status": "ok"})
        else:
            self._send_json({"error": "Not found"}, 404)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="TikTok data bridge API (SSR-based)")
    parser.add_argument("--proxy", help="Proxy URL (e.g. http://127.0.0.1:7890)")
    parser.add_argument("--auto-proxy", action="store_true", help="Auto-detect proxy")
    args = parser.parse_args()

    if args.proxy:
        set_proxy(args.proxy)
        print(f"[tiktok-api] Using proxy: {args.proxy}")
    elif args.auto_proxy:
        detected = detect_proxy()
        if detected:
            set_proxy(detected["server"])
        else:
            print("[tiktok-api] No proxy detected, connecting directly")

    print("[tiktok-api] Backend: SSR JSON parsing (no login required)")
    server = HTTPServer((HOST, PORT), TikTokHandler)
    print(f"[tiktok-api] Listening on http://{HOST}:{PORT}")
    print(f"[tiktok-api] Health: http://{HOST}:{PORT}/health")
    print(f"[tiktok-api] Fetch: http://{HOST}:{PORT}/api/fetch?url=<tiktok_url>")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[tiktok-api] Shutting down")
        server.shutdown()


if __name__ == "__main__":
    main()
