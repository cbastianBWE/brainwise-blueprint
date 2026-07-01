#!/usr/bin/env python3
"""
Capture BrainWise Help Center screenshots for every documented role.

The Help Center pages under `/help` render static PNGs stored on the Lovable
CDN. Each PNG was captured by logging into a test account with Playwright and
screenshotting a page at a fixed 1280×1800 viewport. When the UI changes, the
screenshots go stale — this script re-captures every one in a single run.

Usage (from a machine with Python + Playwright installed):

    pip install playwright
    python -m playwright install chromium
    python scripts/capture-help-screenshots.py                # all roles
    python scripts/capture-help-screenshots.py --role coach   # one role
    python scripts/capture-help-screenshots.py --base-url https://brainwise-seedling.lovable.app

After running, upload the freshly captured PNGs to the CDN with the sandbox
`lovable-assets` CLI and overwrite the matching `*.asset.json` files under
`src/assets/help/<role>/`. Existing filenames are intentionally stable so the
guide files under `src/content/help/` do NOT need to change.

Screenshots are written to `/tmp/help-screenshots/<role>/` by default.

Credentials for the test accounts are read from environment variables to keep
the file safe to commit. Defaults fall back to the accounts BrainWise uses in
staging — override anything sensitive locally:

    export HELP_INDIVIDUAL_EMAIL=...       HELP_INDIVIDUAL_PASSWORD=...
    export HELP_COACH_EMAIL=...            HELP_COACH_PASSWORD=...
    export HELP_ORG_MEMBER_EMAIL=...       HELP_ORG_MEMBER_PASSWORD=...
    export HELP_ORG_ADMIN_EMAIL=...        HELP_ORG_ADMIN_PASSWORD=...
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional

from playwright.async_api import Page, async_playwright  # type: ignore

VIEWPORT = {"width": 1280, "height": 1800}


@dataclass
class Capture:
    """A single screenshot: navigate to `path`, wait, then screenshot to `name`.png."""

    path: str
    name: str
    # Optional post-navigation action (click a tab, expand a menu, etc.)
    interact: Optional[Callable[[Page], "asyncio.Future[None]"]] = None
    wait_ms: int = 2500


@dataclass
class RoleCapture:
    role: str
    email_env: str
    password_env: str
    default_email: str
    default_password: str
    pages: List[Capture] = field(default_factory=list)


async def click_tab(page: Page, name: str) -> None:
    await page.get_by_role("tab", name=name).click()
    await page.wait_for_timeout(1200)


async def click_text(page: Page, text: str) -> None:
    await page.get_by_text(text, exact=True).first.click()
    await page.wait_for_timeout(800)


async def scroll_to(page: Page, y: int) -> None:
    await page.evaluate(f"window.scrollTo(0, {y})")
    await page.wait_for_timeout(400)


# ---------------------------------------------------------------------------
# Role configuration. Screenshot filenames MUST match the imports in
# `src/content/help/<role>.ts` — do not rename without also updating the
# corresponding .asset.json filename.
# ---------------------------------------------------------------------------

ROLES: List[RoleCapture] = [
    RoleCapture(
        role="individual",
        email_env="HELP_INDIVIDUAL_EMAIL",
        password_env="HELP_INDIVIDUAL_PASSWORD",
        default_email="cplummer19912003@gmail.com",
        default_password="Evergreen225!",
        pages=[
            Capture("/dashboard", "10_dashboard"),
            Capture("/assessment", "20_assessment_landing"),
            Capture("/my-results", "30_my_results"),
            Capture(
                "/my-results",
                "31_my_results_scroll",
                interact=lambda p: scroll_to(p, 1400),
            ),
            Capture("/development-plan", "40_development_plan"),
            Capture("/shared", "50_shared_with_me"),
            Capture("/settings/sharing", "51_sharing_requests"),
            Capture("/notification-settings", "60_notification_settings"),
            Capture(
                "/notification-settings",
                "61_notification_settings_scroll",
                interact=lambda p: scroll_to(p, 900),
            ),
            Capture("/settings", "70_settings"),
            Capture("/ai-chat", "80_ai_chat"),
            Capture("/ai-chat/history", "81_chat_history"),
            Capture("/my-learning", "90_my_learning"),
        ],
    ),
    RoleCapture(
        role="coach",
        email_env="HELP_COACH_EMAIL",
        password_env="HELP_COACH_PASSWORD",
        default_email="testcoach@gmail.com",
        default_password="Testcoach1",
        pages=[
            Capture("/my-clients", "10_my_clients"),
            Capture("/client-results", "11_client_results"),
            Capture("/coach/templates", "20_feedback_templates"),
            Capture("/team-paired-reports", "30_team_paired"),
            Capture("/orders", "40_orders"),
            Capture("/order-assessment", "41_order_assessment"),
            Capture("/coach/certification", "60_certification"),
            Capture("/ai-chat", "70_ai_chat"),
            Capture("/resources", "80_resources"),
            Capture("/dashboard", "90_dashboard"),
            Capture("/my-results", "91_my_results"),
            Capture("/settings", "92_settings"),
        ],
    ),
    RoleCapture(
        role="org_member",
        email_env="HELP_ORG_MEMBER_EMAIL",
        password_env="HELP_ORG_MEMBER_PASSWORD",
        default_email="testclientbwe+employee@gmail.com",
        default_password="Testemployee1!",
        pages=[
            Capture("/dashboard", "10_dashboard"),
            Capture("/my-results", "20_my_results"),
            Capture("/development-plan", "30_dev_plan"),
            Capture("/shared", "40_shared"),
            Capture("/assessment", "50_assessment"),
            Capture("/notification-settings", "60_notifications"),
            Capture("/settings", "70_settings"),
            Capture("/ai-chat", "80_ai_chat"),
            Capture("/ai-chat/history", "81_chat_history"),
            Capture("/my-learning", "90_my_learning"),
        ],
    ),
    RoleCapture(
        role="org_admin",
        email_env="HELP_ORG_ADMIN_EMAIL",
        password_env="HELP_ORG_ADMIN_PASSWORD",
        default_email="testclientbwe+orgmember@gmail.com",
        default_password="Testorgmember1!",
        pages=[
            Capture("/dashboard", "10_dashboard"),
            Capture("/admin/users", "20_users_invite"),
            Capture(
                "/admin/users",
                "21_users_list",
                interact=lambda p: click_tab(p, "Users"),
            ),
            Capture(
                "/admin/users",
                "22_pending_invitations",
                interact=lambda p: scroll_to(p, 1200),
            ),
            Capture("/team-paired-reports", "30_team_paired"),
            Capture("/admin/resources", "35_admin_resources"),
            Capture("/company/features", "40_features"),
            Capture(
                "/company/features",
                "41_features_overrides",
                interact=lambda p: scroll_to(p, 1400),
            ),
            Capture("/dashboard/interventions", "60_interventions"),
            Capture("/settings", "80_settings"),
        ],
    ),
]


async def login(page: Page, base_url: str, email: str, password: str) -> None:
    await page.goto(f"{base_url}/login", wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.wait_for_timeout(5000)
    if "/login" in page.url:
        raise RuntimeError(f"Login failed for {email}; still on {page.url}")


async def capture_role(role_cfg: RoleCapture, base_url: str, out_root: Path) -> None:
    email = os.environ.get(role_cfg.email_env, role_cfg.default_email)
    password = os.environ.get(role_cfg.password_env, role_cfg.default_password)
    out_dir = out_root / role_cfg.role
    out_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport=VIEWPORT)
        page = await ctx.new_page()
        print(f"[{role_cfg.role}] logging in as {email}")
        await login(page, base_url, email, password)

        for cap in role_cfg.pages:
            try:
                await page.goto(f"{base_url}{cap.path}", wait_until="domcontentloaded")
                await page.wait_for_timeout(cap.wait_ms)
                if cap.interact:
                    try:
                        await cap.interact(page)
                    except Exception as exc:  # noqa: BLE001
                        print(f"  ! interact failed for {cap.name}: {exc}")
                target = out_dir / f"{cap.name}.png"
                await page.screenshot(path=str(target))
                print(f"  ✓ {cap.path} → {target.name}")
            except Exception as exc:  # noqa: BLE001
                print(f"  ✗ {cap.path} failed: {exc}")

        await browser.close()


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--role",
        choices=[r.role for r in ROLES],
        help="Capture a single role (default: all).",
    )
    parser.add_argument(
        "--base-url",
        default=os.environ.get("HELP_BASE_URL", "http://localhost:8080"),
        help="BrainWise base URL (default: http://localhost:8080).",
    )
    parser.add_argument(
        "--out",
        default="/tmp/help-screenshots",
        help="Directory to write screenshots to.",
    )
    args = parser.parse_args()

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    roles = [r for r in ROLES if not args.role or r.role == args.role]
    for role_cfg in roles:
        await capture_role(role_cfg, args.base_url.rstrip("/"), out_root)

    print(f"\nDone. Screenshots in {out_root}.")
    print(
        "Next: upload each PNG with `lovable-assets create --file <png> --filename "
        "<name>.png > src/assets/help/<role>/<name>.png.asset.json`, then commit."
    )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
