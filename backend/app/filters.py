import re

BLOCKED_WORDS = [
    "crypto giveaway", "nude", "onlyfans", "wire transfer", "click here to claim",
]

_PATTERN = re.compile("|".join(re.escape(w) for w in BLOCKED_WORDS), re.IGNORECASE)

def contains_blocked_content(text: str) -> bool:
    return bool(_PATTERN.search(text))
