"""Convert exported cookie JSON to Playwright storage_state format.

Usage:
  python3 scripts/import_cookies.py cookies.json
  python3 scripts/import_cookies.py --paste   (paste JSON from clipboard)

Supported formats:
  - EditThisCookie: [{"domain":".tiktok.com","name":"sessionid","value":"..."}, ...]
  - Cookie-Editor: [{"Domain":".tiktok.com","Name":"sessionid","Value":"..."}, ...]
  - Simple JSON: {"sessionid":"...", "sessionid_ss":"..."}
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "tiktok_state.json")


def convert_cookies(raw: list[dict]) -> list[dict]:
    """Convert various cookie JSON formats to Playwright format."""
    result = []
    for c in raw:
        name = c.get("name") or c.get("Name") or c.get("NAME") or ""
        value = c.get("value") or c.get("Value") or c.get("VALUE") or ""
        domain = c.get("domain") or c.get("Domain") or c.get("DOMAIN") or ".tiktok.com"

        if not name or not value:
            continue
        # Only keep TikTok cookies
        if "tiktok" not in domain.lower():
            continue

        # Normalize sameSite to Playwright expected values
        raw_same_site = (c.get("sameSite") or c.get("SameSite") or "unspecified").lower()
        if raw_same_site in ("no_restriction", "none"):
            same_site = "None"
        elif raw_same_site == "strict":
            same_site = "Strict"
        else:
            same_site = "Lax"  # lax, unspecified, or missing

        result.append({
            "name": name,
            "value": value,
            "domain": domain,
            "path": c.get("path") or c.get("Path") or "/",
            "httpOnly": c.get("httpOnly") or c.get("HttpOnly") or c.get("httponly") or False,
            "secure": c.get("secure") or c.get("Secure") or True,
            "sameSite": same_site,
        })
    return result


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("No input file specified.")
        sys.exit(1)

    input_data = None

    if sys.argv[1] == "--paste":
        # Try to read from clipboard (macOS)
        import subprocess
        result = subprocess.run(["pbpaste"], capture_output=True, text=True)
        text = result.stdout.strip()
        try:
            input_data = json.loads(text)
        except json.JSONDecodeError:
            print("Clipboard does not contain valid JSON")
            sys.exit(1)
    else:
        with open(sys.argv[1]) as f:
            input_data = json.load(f)

    # Handle different formats
    if isinstance(input_data, dict):
        if "cookies" in input_data:
            cookies = convert_cookies(input_data["cookies"])
        else:
            # Simple name:value dict
            cookies = []
            raw_list = input_data if not any(isinstance(v, dict) for v in input_data.values()) else []
            if not raw_list:
                # Treat as name:value pairs
                for name, value in input_data.items():
                    if isinstance(value, str):
                        cookies.append({
                            "name": name,
                            "value": value,
                            "domain": ".tiktok.com",
                            "path": "/",
                            "httpOnly": True,
                            "secure": True,
                            "sameSite": "Lax",
                        })
    elif isinstance(input_data, list):
        # EditThisCookie or Cookie-Editor format
        cookies = convert_cookies(input_data)
    else:
        print("Unknown JSON format")
        sys.exit(1)

    if not cookies:
        print("No TikTok cookies found in input")
        sys.exit(1)

    # Load existing state if any
    state = {"cookies": [], "origins": []}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
        except Exception:
            pass

    # Merge: update existing, add new
    existing_names = {c["name"] for c in state["cookies"]}
    for c in cookies:
        if c["name"] in existing_names:
            # Replace existing
            state["cookies"] = [x for x in state["cookies"] if x["name"] != c["name"]]
            existing_names.discard(c["name"])
        state["cookies"].append(c)

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

    print(f"Imported {len(cookies)} cookies")
    print("Session cookies found:")
    for c in cookies:
        if "session" in c["name"].lower():
            print(f"  {c['name']} (domain: {c['domain']})")
    print(f"\nSaved to {STATE_FILE}")
    print("Scraper will now use these cookies automatically.")


if __name__ == "__main__":
    main()
