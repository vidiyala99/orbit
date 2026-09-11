from unittest.mock import MagicMock, patch

import httpx

from app.geocoding import geocode_city


@patch("app.geocoding.httpx.get")
def test_geocode_city_returns_lat_lon_on_success(mock_get):
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: [{"lat": "30.2672", "lon": "-97.7431"}],
    )

    result = geocode_city("Austin, TX")

    assert result == (30.2672, -97.7431)
    called_url = mock_get.call_args[0][0]
    assert called_url == "https://nominatim.openstreetmap.org/search"
    assert mock_get.call_args.kwargs["params"] == {"q": "Austin, TX", "format": "json", "limit": 1}
    assert "User-Agent" in mock_get.call_args.kwargs["headers"]
    assert mock_get.call_args.kwargs["timeout"] == 3


@patch("app.geocoding.httpx.get")
def test_geocode_city_returns_none_on_timeout(mock_get):
    mock_get.side_effect = httpx.TimeoutException("timed out")

    assert geocode_city("Nowhere") is None


@patch("app.geocoding.httpx.get")
def test_geocode_city_returns_none_on_empty_results(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: [])

    assert geocode_city("Nonexistent Place XYZ") is None


@patch("app.geocoding.httpx.get")
def test_geocode_city_returns_none_on_non_200(mock_get):
    mock_get.return_value = MagicMock(status_code=503, json=lambda: [])

    assert geocode_city("Austin, TX") is None


@patch("app.geocoding.httpx.get")
def test_geocode_city_returns_none_on_malformed_response(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: [{"unexpected": "shape"}])

    assert geocode_city("Austin, TX") is None


@patch("app.geocoding.httpx.get")
def test_geocode_city_returns_none_on_request_error(mock_get):
    mock_get.side_effect = httpx.RequestError("connection failed")

    assert geocode_city("Austin, TX") is None
