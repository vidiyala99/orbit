"""Symmetric encryption helpers for Luma credentials.

A Fernet key is derived from settings.jwt_secret so no extra env var is
needed for the hackathon.  Changing jwt_secret will invalidate stored
ciphertexts — the user would simply need to reconnect Luma again.
"""
import base64

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from .config import settings

# Salt is fixed (non-secret) — its purpose is domain separation so the
# derived key is distinct from the JWT signing key even if they share the
# same secret.
_SALT = b"orbit-luma-v1"
_PBKDF2_ITERATIONS = 100_000


def _fernet() -> Fernet:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=_PBKDF2_ITERATIONS,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.jwt_secret.encode()))
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    """Return a Fernet ciphertext string safe to store in the DB."""
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt a value produced by encrypt_secret.  Raises InvalidToken on
    tamper or wrong key — callers should treat that as 'not connected'."""
    return _fernet().decrypt(ciphertext.encode()).decode()
