import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings

_ITER = 60_000


def _hash(secret: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(12)
    dk = hashlib.pbkdf2_hmac("sha256", secret.encode(), salt, _ITER)
    return f"{salt.hex()}${dk.hex()}"


def _check(secret: str, stored: str | None) -> bool:
    if not stored:
        return False
    salt_hex, _ = stored.split("$", 1)
    return hmac.compare_digest(_hash(secret, bytes.fromhex(salt_hex)), stored)


def hash_password(pw: str) -> str:
    return _hash(pw)


def verify_password(pw: str, stored: str | None) -> bool:
    return _check(pw, stored)


hash_pin = hash_password
verify_pin = verify_password


def create_token(user_id: int, role: str, hours: int = 24 * 7) -> str:
    exp = datetime.now(UTC) + timedelta(hours=hours)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": exp}, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
