from __future__ import annotations

from decimal import Decimal, getcontext

getcontext().prec = 60

WAD = Decimal(10) ** 18


def to_wad(value: Decimal | int | str) -> int:
    return int(Decimal(value) * WAD)


def from_wad(value: int) -> Decimal:
    return Decimal(value) / WAD


def wad_mul(a: int, b: int) -> int:
    return (a * b) // int(WAD)


def wad_div(a: int, b: int) -> int:
    if b == 0:
        raise ZeroDivisionError("wad division by zero")
    return (a * int(WAD)) // b


def fixed_apy_from_pt_price(pt_price: int, days_to_expiry: int) -> int:
    if pt_price <= 0 or days_to_expiry <= 0:
        raise ValueError("positive price and expiry are required")
    one_over_price = wad_div(int(WAD), pt_price)
    raw = one_over_price - int(WAD)
    return (raw * 365) // days_to_expiry


if __name__ == "__main__":
    price = to_wad("0.9825")
    apy = fixed_apy_from_pt_price(price, 90)
    print({"pt_price": price, "apy_wad": apy, "apy": str(from_wad(apy))})
