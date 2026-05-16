from __future__ import annotations

from decimal import Decimal, getcontext
from typing import Callable

getcontext().prec = 90

try:
    import mpmath as mp

    mp.mp.dps = 90
except ModuleNotFoundError:  # Keeps validation usable before requirements are installed.
    mp = None

WAD = 10**18
SECONDS_PER_YEAR = 31_536_000


def div_toward_zero(numerator: int, denominator: int) -> int:
    if denominator == 0:
        raise ZeroDivisionError("division by zero")
    value = abs(numerator) // abs(denominator)
    return -value if (numerator < 0) ^ (denominator < 0) else value


def to_wad(value: Decimal | int | str) -> int:
    return int(Decimal(str(value)) * WAD)


def from_wad(value: int) -> Decimal:
    return Decimal(value) / WAD


def wad_mul(a: int, b: int) -> int:
    return div_toward_zero(a * b, WAD)


def wad_div(a: int, b: int) -> int:
    return div_toward_zero(a * WAD, b)


def ln_wad_reference(x: int) -> int:
    if x <= 0:
        raise ValueError("ln input must be positive")
    return _to_reference_wad(lambda value: _ln(value), x)


def exp_wad_reference(x: int) -> int:
    return _to_reference_wad(lambda value: _exp(value), x)


def sqrt_wad_reference(x: int) -> int:
    if x < 0:
        raise ValueError("sqrt input must be non-negative")
    return _to_reference_wad(lambda value: _sqrt(value), x)


def logit_reference(p: int) -> int:
    if p <= 0 or p >= WAD:
        raise ValueError("probability out of bounds")
    return _to_reference_wad(lambda value: _ln(value / (1 - value)), p)


def sigmoid_reference(x: int) -> int:
    return _to_reference_wad(lambda value: 1 / (1 + _exp(-value)), x)


def fixed_apy_from_pt_price(pt_price: int, days_to_expiry: int) -> int:
    if pt_price <= 0 or days_to_expiry <= 0:
        raise ValueError("positive price and expiry are required")
    one_over_price = wad_div(WAD, pt_price)
    raw = one_over_price - WAD
    return div_toward_zero(raw * 365, days_to_expiry)


def pt_price_from_rate(rate: int, days: int) -> int:
    if days <= 0:
        raise ValueError("positive days are required")
    term = div_toward_zero(rate * days, 365)
    return wad_div(WAD, WAD + term)


def yt_price_from_pt(pt_price: int) -> int:
    if pt_price < 0 or pt_price > WAD:
        raise ValueError("PT price out of bounds")
    return WAD - pt_price


def accrued_yield(sy_amount: int, old_rate: int, new_rate: int) -> int:
    if sy_amount < 0 or old_rate <= 0 or new_rate <= 0:
        raise ValueError("positive inputs are required")
    if new_rate <= old_rate:
        return 0
    return wad_mul(sy_amount, new_rate - old_rate)


def seconds_to_years_wad(seconds: int) -> int:
    return div_toward_zero(seconds * WAD, SECONDS_PER_YEAR)


def _to_reference_wad(fn: Callable, wad_value: int) -> int:
    scaled = _mp_or_decimal(wad_value) / _mp_or_decimal(WAD)
    result = fn(scaled) * _mp_or_decimal(WAD)
    return int(result)


def _mp_or_decimal(value: int | str | Decimal):
    return mp.mpf(str(value)) if mp is not None else Decimal(str(value))


def _ln(value):
    return mp.log(value) if mp is not None else value.ln()


def _exp(value):
    return mp.exp(value) if mp is not None else value.exp()


def _sqrt(value):
    return mp.sqrt(value) if mp is not None else value.sqrt()


def _print_vector(name: str, value: int) -> None:
    print(f"{name}: {value} ({from_wad(value)})")


if __name__ == "__main__":
    print(f"backend: {'mpmath' if mp is not None else 'decimal'}")
    vectors = {
        "ln(0.1)": ln_wad_reference(to_wad("0.1")),
        "ln(0.25)": ln_wad_reference(to_wad("0.25")),
        "ln(0.75)": ln_wad_reference(to_wad("0.75")),
        "ln(1.5)": ln_wad_reference(to_wad("1.5")),
        "ln(10)": ln_wad_reference(to_wad("10")),
        "exp(-2)": exp_wad_reference(to_wad("-2")),
        "exp(-1)": exp_wad_reference(to_wad("-1")),
        "exp(0.5)": exp_wad_reference(to_wad("0.5")),
        "exp(2)": exp_wad_reference(to_wad("2")),
        "sqrt(2)": sqrt_wad_reference(to_wad("2")),
        "sqrt(10)": sqrt_wad_reference(to_wad("10")),
        "logit(0.1)": logit_reference(to_wad("0.1")),
        "logit(0.9)": logit_reference(to_wad("0.9")),
        "sigmoid(-2)": sigmoid_reference(to_wad("-2")),
        "sigmoid(2)": sigmoid_reference(to_wad("2")),
        "fixed_apy(0.9825,90)": fixed_apy_from_pt_price(to_wad("0.9825"), 90),
        "pt_price(7.2%,90)": pt_price_from_rate(to_wad("0.072"), 90),
    }
    for vector_name, vector_value in vectors.items():
        _print_vector(vector_name, vector_value)
