import logging

import httpx

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = "StayConnected/1.0 (onboarding geocoding)"


def geocode_city(city: str) -> tuple[float, float] | None:
    """Best-effort geocode of a free-text city name via Nominatim.

    Never raises — any failure (timeout, non-200, empty/malformed response)
    is logged and results in None so callers can degrade gracefully.
    """
    try:
        response = httpx.get(
            NOMINATIM_URL,
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": NOMINATIM_USER_AGENT},
            timeout=3,
        )
        if response.status_code != 200:
            logger.warning("geocode_city: non-200 response %s for %r", response.status_code, city)
            return None

        results = response.json()
        if not results:
            logger.info("geocode_city: no results for %r", city)
            return None

        first = results[0]
        return float(first["lat"]), float(first["lon"])
    except Exception:
        logger.warning("geocode_city: failed to geocode %r", city, exc_info=True)
        return None
