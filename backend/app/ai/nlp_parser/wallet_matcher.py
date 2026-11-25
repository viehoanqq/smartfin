"""Match only wallets supplied by the caller (never query other users here)."""
import re
from dataclasses import dataclass
from typing import Mapping, Any


@dataclass(frozen=True)
class WalletMatch:
    wallet_id: int | None
    remaining: str
    warnings: tuple[str, ...] = ()


def match_wallet(text: str, wallets: list[Mapping[str, Any]], default_wallet_id: int | None = None) -> WalletMatch:
    matches = []
    for wallet in wallets:
        name = str(wallet["name"]).strip()
        if not name:
            continue
        found = re.search(rf"(?<!\w){re.escape(name)}(?!\w)", text, re.I)
        if found:
            matches.append((wallet, found))
    if len(matches) > 1:
        return WalletMatch(None, text, ("Nhiều ví cùng khớp; hãy chọn ví",))
    if matches:
        wallet, found = matches[0]
        remaining = (text[:found.start()] + " " + text[found.end():]).strip()
        return WalletMatch(int(wallet["id"]), remaining)
    allowed_ids = {int(wallet["id"]) for wallet in wallets}
    if default_wallet_id in allowed_ids:
        return WalletMatch(default_wallet_id, text)
    if len(wallets) == 1:
        return WalletMatch(int(wallets[0]["id"]), text)
    return WalletMatch(None, text, ("Chọn ví",))
