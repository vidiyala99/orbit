"""Unit tests for situational match signal helpers."""
from app.signals import infer_signals, merge_signals, normalize_signals


def test_normalize_keeps_vocab_only():
    assert normalize_signals(["Potentially hiring", "Nope", "Investor"]) == [
        "Potentially hiring",
        "Investor",
    ]


def test_infer_hiring_and_funded():
    tags = infer_signals(
        role="Recruiter hiring PMs",
        relevance="Just closed Fund III and writing seed checks",
    )
    assert "Potentially hiring" in tags
    assert "Just got funded" in tags or "Investor" in tags


def test_ai_engineer_is_not_design_partner():
    tags = infer_signals(
        role="AI Engineer @ Bright Pattern",
        relevance="As an AI Engineer at Bright Pattern, Sasha may offer relevant engineering insights.",
        priority="needs_you",
    )
    assert "Design partner" not in tags


def test_explicit_design_partner_still_matches():
    tags = infer_signals(
        role="Founder",
        relevance="Looking for a design partner who runs evals",
        priority="needs_you",
    )
    assert "Design partner" in tags


def test_merge_prefers_first_group():
    assert merge_signals(["Warm intro"], ["Investor", "Warm intro"]) == ["Warm intro", "Investor"]
