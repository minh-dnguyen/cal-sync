"""Nager.Date public holiday API client.

API docs: https://date.nager.at/Api
No API key required for the public tier.
"""

import httpx

NAGER_BASE = "https://date.nager.at/api/v3"


async def fetch_public_holidays(year: int, country_code: str) -> list[dict]:
    """Return a list of public holiday objects from Nager.Date for the given year/country.

    Each object contains at minimum:
      - date        (str)  "YYYY-MM-DD"
      - name        (str)  English name
      - localName   (str)  Name in the local language
      - countryCode (str)
      - global      (bool) True if the holiday applies nationwide

    Returns an empty list if the country code is not supported (404).
    Raises httpx.HTTPStatusError for other error responses.
    """
    url = f"{NAGER_BASE}/PublicHolidays/{year}/{country_code.upper()}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json()


async def is_country_supported(country_code: str) -> bool:
    """Quick check whether Nager.Date has data for this country code."""
    url = f"{NAGER_BASE}/AvailableCountries"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        codes = {c["countryCode"] for c in resp.json()}
        return country_code.upper() in codes
