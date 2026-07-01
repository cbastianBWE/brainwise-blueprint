#!/usr/bin/env python3
"""
Capture BrainWise Help Center screenshots — single source of truth.

Reads every `capture: { path, assetPath, scrollY?, tabName?, waitMs? }`
entry from the help content files under `src/content/help/{role}.ts`,
logs into the matching test account, screenshots each page at 1280×1800,
and — with `--upload` — pipes each PNG through `lovable-assets` and
overwrites the matching `<assetPath>.asset.json` pointer file.

Add a new guide? Just add a step with a `capture` block. The next run
picks it up automatically — no edits to this script needed.

Usage
-----
    # Install once (in the sandbox this is preinstalled)
    python -m pip install playwright
    python -m playwright install chromium

    # Screenshot everything to /tmp/help-screenshots and stop
    python scripts/capture-help-screenshots.py

    # Screenshot AND upload/replace the .asset.json pointers in one pass
    python scripts/capture-help-screenshots.py --upload

    # Just one role
    python scripts/capture-help-screenshots.py --role coach --upload

    # Point at production if you want live-URL screenshots
    python scripts/capture-help-screenshots.py \\
        --base-url https://brainwise-seedling.lovable.app --upload

Credentials come from env vars (staging test-account defaults below).
Override sensitive values locally:

    export HELP_INDIVIDUAL_EMAIL=...       HELP_INDIVIDUAL_PASSWORD=...
    export HELP_COACH_EMAIL=...            HELP_COACH_PASSWORD=...
    export HELP_ORG_MEMBER_EMAIL=...       HELP_ORG_MEMBER_PASSWORD=...
    export HELP_ORG_ADMIN_EMAIL=...        HELP_ORG_ADMIN_PASSWORD=...
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from playwright.async_api import Page, async_playwright  # type: ignore

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = PROJECT_ROOT / "src" / "content" / "help"
VIEWPORT = {"width": 1280, "height": 1800}

ROLE_FILES = {
    "individual": "individual.ts",
    "coach": "coach.ts",
    "org_member": "org_member.ts",
    "org_admin": "org_admin.ts",
}

ROLE_CREDS = {
    # role: (email env var, password env var, default email, default password)
    "individual": ("HELP_INDIVIDUAL_EMAIL", "HELP_INDIVIDUAL_PASSWORD",
                   "cplummer19912003@gmail.com", "Evergreen225!"),
    "coach":      ("HELP_COACH_EMAIL", "HELP_COACH_PASSWORD",
                   "testcoach@gmail.com", "Testcoach1"),
    "org_member": ("HELP_ORG_MEMBER_EMAIL", "HELP_ORG_MEMBER_PASSWORD",
                   "testclientbwe+employee@gmail.com", "Testemployee1!"),
    "org_admin":  ("HELP_ORG_ADMIN_EMAIL", "HELP_ORG_ADMIN_PASSWORD",
                   "testclientbwe+orgmember@gmail.com", "Testorgmember1!"),
}


@dataclass
class Capture:
    role: str
    path: str
    asset_path: str  # project-relative, e.g. src/assets/help/individual/10_dashboard.png
    scroll_y: Optional[int] = None
    tab_name: Optional[str] = None
    wait_ms: int = 2500

    @property
    def basename(self) -> str:
        return Path(self.asset_path).name  # e.g. 10_dashboard.png


# ---------------------------------------------------------------------------
# Parse capture entries out of the .ts files (single source of truth).
# Each entry is one line of the form:
#   capture: { path: "…", assetPath: "…", scrollY: 900, tabName: "Users" },
# Fields other than path/assetPath are optional and may appear in any order.
# ---------------------------------------------------------------------------

CAPTURE_RE = re.compile(
    r"capture:\s*\{\s*(?P<body>[^{}]+?)\}", re.DOTALL
)
FIELD_STRING_RE = re.compile(r'(\w+)\s*:\s*"([^"]*)"')
FIELD_NUMBER_RE = re.compile(r"(\w+)\s*:\s*(\d+)")


def parse_captures(role: str, file_path: Path) -> List[Capture]:
    text = file_path.read_text(encoding="utf-8")
    out: List[Capture] = []
    for m in CAPTURE_RE.finditer(text):
        body = m.group("body")
        strings = dict(FIELD_STRING_RE.findall(body))
        numbers = {k: int(v) for k, v in FIELD_NUMBER_RE.findall(body)
                   if k not in strings}
        path = strings.get("path")
        asset_path = strings.get("assetPath")
        if not path or not asset_path:
            continue
        out.append(Capture(
            role=role,
            path=path,
            asset_path=asset_path,
            scroll_y=numbers.get("scrollY"),
            tab_name=strings.get("tabName"),
            wait_ms=numbers.get("waitMs", 2500),
        ))
    return out


def load_all_captures(role_filter: Optional[str]) -> Dict[str, List[Capture]]:
    grouped: Dict[str, List[Capture]] = {}
    for role, filename in ROLE_FILES.items():
        if role_filter and role != role_filter:
            continue
        path = CONTENT_DIR / filename
        if not path.exists():
            print(f"! missing content file: {path}", file=sys.stderr)
            continue
        caps = parse_captures(role, path)
        if caps:
            grouped[role] = caps
    return grouped


# ---------------------------------------------------------------------------
# Playwright
# ---------------------------------------------------------------------------

async def login(page: Page, base_url: str, email: str, password: str) -> None:
    await page.goto(f"{base_url}/login", wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.wait_for_timeout(5000)
    if "/login" in page.url:
        raise RuntimeError(f"Login failed for {email}; still on {page.url}")


async def do_capture(page: Page, base_url: str, cap: Capture, out_png: Path) -> None:
    await page.goto(f"{base_url}{cap.path}", wait_until="domcontentloaded")
    await page.wait_for_timeout(cap.wait_ms)
    if cap.tab_name:
        try:
            await page.get_by_role("tab", name=cap.tab_name).click()
            await page.wait_for_timeout(1200)
        except Exception as exc:
            print(f"    ! tab click '{cap.tab_name}' failed: {exc}")
    if cap.scroll_y is not None:
        await page.evaluate(f"window.scrollTo(0, {cap.scroll_y})")
        await page.wait_for_timeout(400)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(out_png))


# ---------------------------------------------------------------------------
# Uploads — writes the new .asset.json pointer next to the target PNG path.
# ---------------------------------------------------------------------------

def upload_to_cdn(png_path: Path, cap: Capture) -> None:
    filename = cap.basename
    try:
        result = subprocess.run(
            ["lovable-assets", "create", "--file", str(png_path), "--filename", filename],
            check=True, capture_output=True, text=True,
        )
    except FileNotFoundError:
        raise RuntimeError("`lovable-assets` CLI not on PATH — run without --upload "
                           "or execute this inside the Lovable sandbox.")
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"lovable-assets failed for {filename}: {exc.stderr.strip()}") from exc

    # Verify JSON, then write to <assetPath>.asset.json (overwrite in place).
    try:
        json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"unexpected lovable-assets output for {filename}: {exc}\n{result.stdout}")

    pointer_path = PROJECT_ROOT / f"{cap.asset_path}.asset.json"
    pointer_path.write_text(result.stdout, encoding="utf-8")
    print(f"    ↑ uploaded → {pointer_path.relative_to(PROJECT_ROOT)}")


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

async def capture_role(role: str, caps: List[Capture], base_url: str,
                       out_root: Path, do_upload: bool) -> None:
    email_env, pw_env, default_email, default_pw = ROLE_CREDS[role]
    email = os.environ.get(email_env, default_email)
    password = os.environ.get(pw_env, default_pw)
    role_out = out_root / role

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport=VIEWPORT)
        page = await ctx.new_page()
        print(f"[{role}] logging in as {email} ({len(caps)} captures)")
        await login(page, base_url, email, password)

        for cap in caps:
            out_png = role_out / cap.basename
            try:
                await do_capture(page, base_url, cap, out_png)
                print(f"  ✓ {cap.path} → {cap.basename}")
                if do_upload:
                    upload_to_cdn(out_png, cap)
            except Exception as exc:
                print(f"  ✗ {cap.path} failed: {exc}")

        await browser.close()


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--role", choices=list(ROLE_FILES.keys()),
                        help="Capture a single role (default: all).")
    parser.add_argument("--base-url",
                        default=os.environ.get("HELP_BASE_URL", "http://localhost:8080"),
                        help="BrainWise base URL (default: http://localhost:8080).")
    parser.add_argument("--out", default="/tmp/help-screenshots",
                        help="Where to write PNGs on disk.")
    parser.add_argument("--upload", action="store_true",
                        help="After each screenshot, upload to the CDN via `lovable-assets` "
                             "and overwrite the matching *.asset.json pointer in the repo.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print the parsed capture list and exit without launching a browser.")
    args = parser.parse_args()

    grouped = load_all_captures(args.role)
    total = sum(len(v) for v in grouped.values())
    if total == 0:
        print("No `capture:` entries found in src/content/help/*.ts — nothing to do.")
        return 1

    print(f"Discovered {total} capture(s) across {len(grouped)} role(s):")
    for role, caps in grouped.items():
        print(f"  {role}: {len(caps)}")
        for c in caps:
            extra = []
            if c.scroll_y is not None: extra.append(f"scrollY={c.scroll_y}")
            if c.tab_name: extra.append(f"tab='{c.tab_name}'")
            suffix = f"  ({', '.join(extra)})" if extra else ""
            print(f"    - {c.path} → {c.asset_path}{suffix}")

    if args.dry_run:
        return 0

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)
    base = args.base_url.rstrip("/")

    for role, caps in grouped.items():
        await capture_role(role, caps, base, out_root, args.upload)

    print(f"\nDone. PNGs in {out_root}.")
    if not args.upload:
        print("Re-run with `--upload` to push these to the CDN and overwrite the "
              "matching *.asset.json pointers in one step.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
