"""Recovery workflow; production storage/email adapters require infrastructure approval.

The in-memory adapter is exclusively for a single-process local demo.
Production adapters must be durable and atomic across workers.
"""
import hashlib
import hmac
import secrets
import time
from threading import Lock
from collections.abc import Callable
from typing import Protocol
from fastapi import HTTPException
from app.core.config import settings


class OTPStore(Protocol):
    def allow_request(self, email_key: str, client_key: str) -> bool:
        """Atomically enforce 60s cooldown, 5/email/hour and 20/client/hour."""
        ...

    def replace(self, key: str, digest: str, ttl_seconds: int, max_attempts: int) -> None:
        """Replace the previous code and attempt count atomically, with TTL."""
        ...

    def verify_and_consume(self, key: str, digest: str) -> bool:
        """Atomically check TTL/attempts; delete on success or attempt exhaustion."""
        ...


class RecoveryMailer(Protocol):
    def send_code(self, email: str, code: str) -> None: ...


class PasswordRecovery:
    def __init__(self, store: OTPStore, mailer: RecoveryMailer, *, secret: str):
        if len(secret.encode("utf-8")) < 32:
            raise ValueError("OTP HMAC key must contain at least 32 bytes")
        self.store, self.mailer = store, mailer
        self.secret = secret.encode("utf-8")

    def key(self, value: str) -> str:
        return hmac.new(self.secret, value.encode("utf-8"), hashlib.sha256).hexdigest()

    def issue(self, email: str, client: str, *, deliver: bool):
        key = self.key("email:" + email)
        if not self.store.allow_request(key, self.key("client:" + client)):
            raise HTTPException(status_code=429, detail="Vui lòng đợi trước khi yêu cầu mã mới.",
                                headers={"Retry-After": "60"})
        code = f"{secrets.randbelow(1_000_000):06d}"
        self.store.replace(key, self.key(email + ":" + code), 300, 5)
        if deliver:
            self.mailer.send_code(email, code)

    def consume(self, email: str, code: str):
        if not self.store.verify_and_consume(self.key("email:" + email), self.key(email + ":" + code)):
            raise ValueError("Mã khôi phục không hợp lệ hoặc đã hết hạn.")


class DemoOTPStore:
    """Process-local demo only. Retain digests, never plaintext OTPs or emails."""

    def __init__(self, clock: Callable[[], float] = time.monotonic):
        self._clock = clock
        self._lock = Lock()
        self._codes: dict[str, tuple[str, float, int]] = {}
        self._requests: dict[str, list[float]] = {}

    def allow_request(self, email_key: str, client_key: str) -> bool:
        with self._lock:
            now = self._clock()
            self._codes = {key: item for key, item in self._codes.items() if item[1] > now}
            self._requests = {key: recent for key, times in self._requests.items()
                              if (recent := [t for t in times if now - t < 3600])}
            emails = self._requests.get(email_key, [])
            clients = self._requests.get(client_key, [])
            if (emails and now - emails[-1] < 60) or len(emails) >= 5 or len(clients) >= 20:
                return False
            self._requests[email_key] = emails + [now]
            self._requests[client_key] = clients + [now]
            return True

    def replace(self, key: str, digest: str, ttl_seconds: int, max_attempts: int) -> None:
        with self._lock:
            self._codes[key] = (digest, self._clock() + ttl_seconds, max_attempts)

    def verify_and_consume(self, key: str, digest: str) -> bool:
        with self._lock:
            item = self._codes.get(key)
            if item is None:
                return False
            expected, expiry, attempts = item
            if self._clock() >= expiry:
                del self._codes[key]
                return False
            valid = hmac.compare_digest(expected, digest)
            if valid or attempts <= 1:
                del self._codes[key]
            else:
                self._codes[key] = (expected, expiry, attempts - 1)
            return valid


class DemoConsoleMailer:
    def send_code(self, email: str, code: str) -> None:
        if not settings.OTP_DEMO_MODE or settings.APP_ENV not in {"local", "development"}:
            raise RuntimeError("OTP console delivery is restricted to local demo mode")
        print(f"[OTP DEMO - LOCAL ONLY] {email}: {code} (expires in 5 minutes)", flush=True)


_demo_recovery: PasswordRecovery | None = None
_demo_lock = Lock()


def get_password_recovery() -> PasswordRecovery:
    if not settings.OTP_DEMO_MODE or settings.APP_ENV not in {"local", "development"}:
        raise HTTPException(status_code=503, detail="Khôi phục mật khẩu tạm thời chưa khả dụng. Vui lòng liên hệ hỗ trợ.")
    # Keep the same store/key between requests; never instantiate a fresh store per request.
    global _demo_recovery
    with _demo_lock:
        if _demo_recovery is None:
            _demo_recovery = PasswordRecovery(DemoOTPStore(), DemoConsoleMailer(), secret=secrets.token_hex(32))
        return _demo_recovery
