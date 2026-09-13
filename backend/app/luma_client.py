"""Best-effort Luma API / session client.

Attendee auth (preferred):
  1. request_email_sign_in_code(email, turnstile_token?) — triggers Luma's
     6-digit email code. Luma gates this behind Cloudflare Turnstile; without
     a valid token we return needs_luma_browser=True so the client can open
     luma.com/signin once.
  2. establish_session_from_email_code(email, code) — exchanges the code for
     session cookies (this call does not require Turnstile).

Legacy helpers (password / magic-link / organiser API key) remain for tests
and older clients. Guest lists for events an attendee is Going to require
session cookies — the public API key path is organiser-only.
"""
import asyncio
import json
import logging
import sys
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import TypeVar

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 8.0  # seconds — fail fast, never block a user response

# ---------------------------------------------------------------------------
# Session-based path (attendee — Going events)
# ---------------------------------------------------------------------------

# Luma's internal API base. These endpoints are undocumented and may change.
_LUMA_API_BASE = "https://api.lu.ma"

# Browser-like headers Luma's web client sends (from their JS bundles).
_LUMA_WEB_HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Origin": "https://luma.com",
    "Referer": "https://luma.com/signin",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "x-luma-client-type": "luma-web",
    "x-luma-web-url": "https://luma.com/signin",
}

# Known candidate endpoints for password/email login.
# Luma almost certainly uses magic-link / OAuth; these are best-effort.
_LOGIN_ENDPOINTS = [
    f"{_LUMA_API_BASE}/auth/sign-in/email/password",
    f"{_LUMA_API_BASE}/auth/sign-in-with-password",
    f"{_LUMA_API_BASE}/user/sign-in-with-email",
]


async def request_email_sign_in_code(
    email: str,
    turnstile_token: str | None = None,
) -> dict:
    """Ask Luma to email a 6-digit sign-in code.

    Stays inside Orbit: HTTP first, then a short automated browser pass when
    Luma requires Cloudflare Turnstile (no user trip to luma.com).

    Returns:
      {"ok": True, "status": "code_sent"}
      {"ok": False, "status": "error", "detail": "..."}
    """
    email = (email or "").strip()
    if not email or "@" not in email:
        return {"ok": False, "status": "error", "detail": "Enter a valid Luma email"}

    direct = await _request_email_code_http(email, turnstile_token)
    if direct.get("ok"):
        return direct
    if direct.get("status") == "needs_browser":
        return await _request_email_code_via_browser(email)
    return direct


async def _request_email_code_http(
    email: str,
    turnstile_token: str | None = None,
) -> dict:
    headers = dict(_LUMA_WEB_HEADERS)
    if turnstile_token:
        headers["x-luma-turnstile-token"] = turnstile_token

    urls = [
        f"{_LUMA_API_BASE}/auth/email/start-with-email",
        f"{_LUMA_API_BASE}/auth/email/send-sign-in-code",
    ]
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            last_detail = "Could not reach Luma"
            for url in urls:
                res = await client.post(url, json={"email": email}, headers=headers)
                if res.status_code == 200:
                    data = {}
                    try:
                        data = res.json()
                    except Exception:
                        pass
                    if data.get("sso_config"):
                        return {
                            "ok": False,
                            "status": "error",
                            "detail": (
                                "This Luma account uses SSO, which Orbit can’t complete "
                                "in-app. Use a personal Luma email login instead."
                            ),
                        }
                    return {"ok": True, "status": "code_sent", "next_step": data.get("next_step")}

                try:
                    payload = res.json()
                except Exception:
                    payload = {}
                err_code = payload.get("code") or ""
                msg = payload.get("message") or res.text[:200]
                if res.status_code == 403 and "additional-verification" in str(err_code):
                    return {"ok": False, "status": "needs_browser", "detail": msg}
                if res.status_code in (400, 404, 422):
                    last_detail = msg or last_detail
                    continue
                last_detail = msg or f"Luma returned {res.status_code}"
            return {"ok": False, "status": "error", "detail": last_detail}
    except Exception:
        logger.warning("request_email_sign_in_code http failed", exc_info=True)
        return {"ok": False, "status": "error", "detail": "Could not reach Luma — try again"}


T = TypeVar("T")


async def run_on_subprocess_capable_loop(coro_factory: Callable[[], Awaitable[T]]) -> T:
    """Run coroutine work that spawns subprocesses (Playwright launching Chromium).

    uvicorn --reload on Windows installs the Selector event loop policy, and a
    Selector loop can't spawn subprocesses. So the work runs in a worker thread
    on its own loop: Proactor on Windows (asyncio.run would pick up the Selector
    policy too), the default loop elsewhere.
    """
    def run() -> T:
        loop = asyncio.ProactorEventLoop() if sys.platform == "win32" else asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro_factory())
        finally:
            loop.close()

    return await asyncio.to_thread(run)


async def _request_email_code_via_browser(email: str) -> dict:
    return await run_on_subprocess_capable_loop(lambda: _browser_code_request(email))


async def _browser_code_request(email: str) -> dict:
    """Drive luma.com/signin just long enough to send the email code.

    Runs Chromium off-screen so the end user never sees another tab/window.
    Closes before code entry — that stays in the Orbit modal.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return {
            "ok": False,
            "status": "error",
            "detail": "Couldn’t send the Luma code automatically. Try again in a moment.",
        }

    # Only a real HTTP 200 from Luma's auth API counts — page copy can false-positive.
    api_status: int | None = None
    api_body = ""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--window-position=-2400,-2400",
                    "--window-size=1100,800",
                ],
            )
            context = await browser.new_context(
                user_agent=_LUMA_WEB_HEADERS["User-Agent"],
                viewport={"width": 1100, "height": 800},
                locale="en-US",
            )
            page = await context.new_page()
            await page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )

            async def on_response(resp) -> None:
                nonlocal api_status, api_body
                url = resp.url
                if resp.request.method != "POST":
                    return
                if "start-with-email" not in url and "send-sign-in-code" not in url:
                    return
                api_status = resp.status
                try:
                    api_body = (await resp.text())[:300]
                except Exception:
                    api_body = ""
                logger.info("luma code API %s → %s %s", url, api_status, api_body)

            page.on("response", on_response)
            await page.goto("https://luma.com/signin", wait_until="domcontentloaded", timeout=90000)
            await page.wait_for_selector('input[type="email"]', timeout=30000)
            await page.fill('input[type="email"]', email)
            await page.get_by_role("button", name="Continue with Email").click()

            for _ in range(90):
                if api_status == 200:
                    break
                if api_status is not None and api_status >= 400:
                    break
                await page.wait_for_timeout(1000)

            await browser.close()
    except Exception:
        logger.warning("request_email_sign_in_code browser failed", exc_info=True)
        return {
            "ok": False,
            "status": "error",
            "detail": "Couldn’t send the Luma code automatically. Try again in a moment.",
        }

    if api_status == 200:
        return {"ok": True, "status": "code_sent"}
    if api_status == 403:
        return {
            "ok": False,
            "status": "error",
            "detail": (
                "Luma blocked the automated browser check. "
                "Use the email-link fallback in Connect Luma instead of retrying."
            ),
        }
    return {
        "ok": False,
        "status": "error",
        "detail": (
            "Luma didn’t accept the email request"
            + (f" ({api_status})" if api_status is not None else "")
            + ". Try again."
        ),
    }


async def establish_session_from_email_code(email: str, code: str) -> list[dict] | None:
    """Exchange email + 6-digit code for Luma session cookies."""
    email = (email or "").strip()
    code = (code or "").strip().replace(" ", "")
    if not email or not code:
        return None

    headers = dict(_LUMA_WEB_HEADERS)
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            res = await client.post(
                f"{_LUMA_API_BASE}/auth/email/sign-in-with-code",
                json={"email": email, "code": code},
                headers=headers,
            )
            if res.status_code != 200:
                logger.info(
                    "luma email-code sign-in failed: %d %s",
                    res.status_code,
                    (res.text or "")[:200],
                )
                return None
            cookies = _cookies_from_client(client)
            try:
                payload = res.json()
            except Exception:
                payload = {}
            for key in ("auth_token", "token", "access_token", "front_auth_secret"):
                val = payload.get(key)
                if isinstance(val, str) and val:
                    cookies.append({
                        "name": key,
                        "value": val,
                        "domain": ".lu.ma",
                        "path": "/",
                    })
            if not _is_auth_session(cookies):
                logger.info(
                    "luma email-code: 200 but no auth session (cookies=%s body=%s)",
                    [c.get("name") for c in cookies],
                    str(payload)[:300],
                )
                return None
            return cookies
    except Exception:
        logger.warning("establish_session_from_email_code failed", exc_info=True)
        return None


async def establish_session(email: str, password: str) -> list[dict] | None:
    """Attempt to create a Luma session via email+password.

    Returns a list of cookie dicts (serialised from httpx.Cookies) if
    successful, or None if every attempt fails.

    In practice Luma uses magic-link / Google OAuth, so this is expected to
    return None. Prefer establish_session_from_magic_link for attendees.
    """
    payload = {"email": email, "password": password}
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Orbit/1.0",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        for url in _LOGIN_ENDPOINTS:
            try:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    cookies = _cookies_from_client(client)
                    if cookies:
                        logger.info("luma session established via %s", url)
                        return cookies
                if res.status_code in (401, 422):
                    logger.info("luma login endpoint %s rejected credentials (%d)", url, res.status_code)
                    return None
            except Exception:
                logger.debug("luma login attempt at %s failed", url, exc_info=True)

    logger.info("luma session: no working login endpoint found — Luma likely requires magic-link/OAuth")
    return None


def _cookies_from_client(client: httpx.AsyncClient) -> list[dict]:
    return [
        {"name": c.name, "value": c.value, "domain": c.domain, "path": c.path}
        for c in client.cookies.jar
    ]


def _is_auth_session(cookies: list[dict]) -> bool:
    """Reject Cloudflare/bot cookies that aren't a real Luma login."""
    names = {(c.get("name") or "").lower() for c in cookies}
    noise = {"__cf_bm", "_cfuvid", "cf_clearance"}
    useful = {n for n in names if n and n not in noise}
    return len(useful) > 0


def _is_luma_auth_url(url: str) -> bool:
    """Accept only Luma sign-in / magic-link URLs — never arbitrary redirects."""
    try:
        from urllib.parse import urlparse
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return host in ("lu.ma", "www.lu.ma", "luma.com", "www.luma.com", "api.lu.ma")


async def establish_session_from_magic_link(magic_link: str) -> list[dict] | None:
    """One-time attendee login: follow a Luma magic-link URL and keep the cookies.

    The user opens Luma sign-in once, gets the email link, pastes it into Orbit.
    We never store their password. Returns None if the link is invalid or expired.
    """
    url = (magic_link or "").strip()
    if not url or not _is_luma_auth_url(url):
        return None

    headers = {
        "Accept": "text/html,application/json",
        "User-Agent": "Orbit/1.0",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)
            cookies = _cookies_from_client(client)
            if not cookies:
                logger.info("luma magic-link: no cookies after %d", res.status_code)
                return None
            # Soft verify: a profile call proves the session is live. Failure
            # still returns cookies — sync can reconnect later if needed.
            try:
                probe = await client.get(
                    f"{_LUMA_API_BASE}/user/get-self",
                    headers={"Accept": "application/json"},
                )
                if probe.status_code not in (200, 401, 403):
                    logger.debug("luma magic-link probe status %d", probe.status_code)
            except Exception:
                logger.debug("luma magic-link probe failed", exc_info=True)
            return cookies
    except Exception:
        logger.warning("establish_session_from_magic_link failed", exc_info=True)
        return None


def _cookie_jar(session_cookies: list[dict]) -> dict[str, str]:
    return {c["name"]: c["value"] for c in session_cookies if "name" in c and "value" in c}


async def fetch_going_events_today(session_cookies: list[dict]) -> list[dict]:
    """Return today's (and upcoming) events the user is Going to.

    Shape of each dict: {title, source_url, location, starts_at, ends_at}.
    Returns [] on any failure.
    """
    cookies = _cookie_jar(session_cookies)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, cookies=cookies) as client:
            res = await client.get(
                f"{_LUMA_API_BASE}/event/get-my-events",
                params={"filter": "going"},
                headers={"Accept": "application/json"},
            )
            if res.status_code != 200:
                logger.info("fetch_going_events_today: got %d from Luma", res.status_code)
                return []
            data = res.json()
            today = datetime.now(timezone.utc).date()
            out = []
            for item in (data.get("events") or data.get("items") or []):
                event = item.get("event") or item
                starts_at = event.get("start_at") or event.get("starts_at")
                if starts_at:
                    try:
                        dt = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
                        if dt.date() < today:
                            continue  # skip past events
                    except ValueError:
                        pass
                out.append({
                    "title": event.get("name") or event.get("title") or "Luma Event",
                    "source_url": event.get("url") or event.get("event_api_id") and f"https://lu.ma/{event['event_api_id']}",
                    "location": event.get("geo_address_info", {}).get("address") if event.get("geo_address_info") else event.get("location"),
                    "starts_at": starts_at,
                    "ends_at": event.get("end_at") or event.get("ends_at"),
                })
            return out
    except Exception:
        logger.warning("fetch_going_events_today failed", exc_info=True)
        return []


async def fetch_event_guests(session_cookies: list[dict], event_ref: str) -> list[dict]:
    """Return guest list for a Luma event.

    event_ref: event_api_id (e.g. "evt-abc123") or a lu.ma short URL slug.
    Shape of each dict: {name, role, avatar_url, linkedin_url, x_url, relevance}.
    Returns [] on any failure.
    """
    cookies = _cookie_jar(session_cookies)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, cookies=cookies) as client:
            res = await client.get(
                f"{_LUMA_API_BASE}/event/get-guests",
                params={"event_api_id": event_ref},
                headers={"Accept": "application/json"},
            )
            if res.status_code != 200:
                logger.info("fetch_event_guests: got %d from Luma", res.status_code)
                return []
            data = res.json()
            out = []
            for entry in (data.get("guests") or data.get("entries") or []):
                guest = entry.get("guest") or entry.get("user") or entry
                out.append({
                    "name": guest.get("name") or "Unknown",
                    "role": guest.get("job_title") or guest.get("headline"),
                    "avatar_url": guest.get("avatar_url") or guest.get("photo_url"),
                    "linkedin_url": guest.get("linkedin_handle") and f"https://linkedin.com/in/{guest['linkedin_handle']}",
                    "x_url": guest.get("twitter_handle") and f"https://x.com/{guest['twitter_handle']}",
                    "relevance": guest.get("bio") or guest.get("relevance"),
                })
            return out
    except Exception:
        logger.warning("fetch_event_guests failed for %s", event_ref, exc_info=True)
        return []


# ---------------------------------------------------------------------------
# API-key path (organiser — hosted events)
# ---------------------------------------------------------------------------

_LUMA_PUBLIC_API = "https://public-api.luma.com"


async def fetch_via_api_key(api_key: str) -> list[dict]:
    """Fetch hosted events for the calendar associated with api_key.

    Uses GET /calendar/list-events (Luma public API).  Returns a flat list of
    event dicts with the same shape as fetch_going_events_today.

    NOTE: The public API only covers events the key-holder *hosts*.  Attendee
    guest lists for events you're merely Going to are not available via this
    path — use session cookies for that.
    """
    headers = {
        "x-luma-api-key": api_key,
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            res = await client.get(
                f"{_LUMA_PUBLIC_API}/calendar/list-events",
                headers=headers,
            )
            if res.status_code != 200:
                logger.info("fetch_via_api_key: got %d from Luma public API", res.status_code)
                return []
            data = res.json()
            out = []
            for entry in (data.get("entries") or []):
                event = entry.get("event") or entry
                out.append({
                    "title": event.get("name") or "Luma Event",
                    "source_url": event.get("url"),
                    "location": (event.get("geo_address_info") or {}).get("address") or event.get("location"),
                    "starts_at": event.get("start_at"),
                    "ends_at": event.get("end_at"),
                    # Store api_id so sync can fetch guests later
                    "_event_api_id": event.get("api_id"),
                })
            return out
    except Exception:
        logger.warning("fetch_via_api_key failed", exc_info=True)
        return []


async def fetch_event_guests_via_api_key(api_key: str, event_api_id: str) -> list[dict]:
    """Fetch guest list for a hosted event using the organiser API key."""
    headers = {
        "x-luma-api-key": api_key,
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            res = await client.get(
                f"{_LUMA_PUBLIC_API}/event/get-guests",
                params={"event_api_id": event_api_id},
                headers=headers,
            )
            if res.status_code != 200:
                logger.info("fetch_event_guests_via_api_key: got %d", res.status_code)
                return []
            data = res.json()
            out = []
            for entry in (data.get("entries") or []):
                guest = entry.get("guest") or entry.get("user") or entry
                out.append({
                    "name": guest.get("name") or "Unknown",
                    "role": guest.get("job_title") or guest.get("headline"),
                    "avatar_url": guest.get("avatar_url"),
                    "linkedin_url": guest.get("linkedin_handle") and f"https://linkedin.com/in/{guest['linkedin_handle']}",
                    "x_url": guest.get("twitter_handle") and f"https://x.com/{guest['twitter_handle']}",
                    "relevance": guest.get("bio"),
                })
            return out
    except Exception:
        logger.warning("fetch_event_guests_via_api_key failed for %s", event_api_id, exc_info=True)
        return []
