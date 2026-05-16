from __future__ import annotations

from dataclasses import dataclass

from math_reference import WAD, div_toward_zero, logit_reference, to_wad, wad_div


@dataclass(frozen=True)
class PoolState:
    total_pt: int
    total_sy: int
    scalar: int
    anchor: int
    fee: int


def get_exchange_rate(pool: PoolState) -> int:
    proportion = wad_div(pool.total_pt, pool.total_pt + pool.total_sy)
    return wad_div(logit_reference(proportion), pool.scalar) + pool.anchor


def get_implied_rate(exchange_rate: int, period_size: int, time_to_maturity: int) -> int:
    if period_size <= 0 or time_to_maturity <= 0:
        raise ValueError("period and maturity must be positive")
    rate_raw = exchange_rate - WAD
    annualizer = div_toward_zero(period_size * WAD, time_to_maturity)
    return div_toward_zero(rate_raw * annualizer, WAD)


def calc_sy_for_exact_pt(pool: PoolState, pt_out: int) -> int:
    if pt_out < 0:
        raise ValueError("PT out must be non-negative")
    if pt_out == 0:
        return 0

    new_total_pt = pool.total_pt - pt_out
    if new_total_pt <= 0:
        raise ValueError("insufficient PT")

    proportion = wad_div(new_total_pt, pool.total_pt + pool.total_sy)
    if not WAD // 100 < proportion < WAD * 99 // 100:
        raise ValueError("proportion out of bounds")

    trade_rate = wad_div(logit_reference(proportion), pool.scalar) + pool.anchor - pool.fee
    if trade_rate <= 0:
        raise ValueError("trade rate must be positive")

    return wad_div(pt_out, trade_rate)


def calc_pt_for_exact_sy(pool: PoolState, sy_in: int) -> int:
    if sy_in < 0:
        raise ValueError("SY in must be non-negative")
    if sy_in == 0:
        return 0

    pool_total = pool.total_pt + pool.total_sy
    max_out_by_bound = pool.total_pt - (pool_total // 100 + WAD)
    max_out_by_liquidity = pool.total_pt * 99 // 100
    lo, hi, best = 0, min(max_out_by_bound, max_out_by_liquidity), 0

    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if calc_sy_for_exact_pt(pool, mid) <= sy_in:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1

    return best


def simulate_trade(pool: PoolState, sy_in: int) -> dict[str, int]:
    pt_out = calc_pt_for_exact_sy(pool, sy_in)
    return {
        "sy_in": sy_in,
        "pt_out": pt_out,
        "sy_needed": calc_sy_for_exact_pt(pool, pt_out),
        "pre_exchange_rate": get_exchange_rate(pool),
        "remaining_pt": pool.total_pt - pt_out,
    }


if __name__ == "__main__":
    initial = PoolState(
        total_pt=500_000 * WAD,
        total_sy=500_000 * WAD,
        scalar=80 * WAD,
        anchor=to_wad("1.025"),
        fee=WAD // 1000,
    )
    print(simulate_trade(initial, 10_000 * WAD))
