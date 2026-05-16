from __future__ import annotations

from dataclasses import dataclass

from math_reference import WAD, wad_div


@dataclass(frozen=True)
class PoolState:
    total_pt: int
    total_sy: int
    scalar: int
    anchor: int
    fee: int


def proportion_after_pt_out(pool: PoolState, pt_out: int) -> int:
    if pt_out <= 0 or pt_out >= pool.total_pt:
        raise ValueError("pt_out must be inside pool bounds")
    return wad_div(pool.total_pt - pt_out, pool.total_pt + pool.total_sy)


def simulate_trade(pool: PoolState, pt_out: int) -> dict[str, int]:
    proportion = proportion_after_pt_out(pool, pt_out)
    return {
        "pt_out": pt_out,
        "post_trade_proportion": proportion,
        "remaining_pt": pool.total_pt - pt_out,
    }


if __name__ == "__main__":
    initial = PoolState(
        total_pt=500_000 * int(WAD),
        total_sy=500_000 * int(WAD),
        scalar=80 * int(WAD),
        anchor=int(1.025 * int(WAD)),
        fee=int(WAD) // 1000,
    )
    print(simulate_trade(initial, 10_000 * int(WAD)))
