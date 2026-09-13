"""Unit tests for hiring-title score boost."""
from app.hiring_titles import has_hiring_title, hiring_title_boost


def test_founder_and_ceo_boost():
    assert has_hiring_title("Co-Founder & CEO")
    assert hiring_title_boost("Founder, Acme") > 0
    assert hiring_title_boost("AI Engineer @ Bright Pattern") == 0
