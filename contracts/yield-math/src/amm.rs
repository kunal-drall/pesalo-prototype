use crate::constants::WAD;
use crate::logit::logit;
use crate::wad::{min, wad_div, wad_mul};

pub fn get_exchange_rate(total_pt: i128, total_sy: i128, scalar: i128, anchor: i128) -> i128 {
    assert!(total_pt > 0 && total_sy > 0, "pool totals must be positive");
    assert!(scalar != 0, "scalar must be non-zero");

    let proportion = wad_div(total_pt, total_pt + total_sy);
    let logit_value = logit(proportion);
    wad_div(logit_value, scalar) + anchor
}

pub fn get_implied_rate(exchange_rate: i128, period_size: u64, time_to_maturity: u64) -> i128 {
    assert!(period_size > 0, "period size must be positive");
    assert!(time_to_maturity > 0, "time to maturity must be positive");

    let rate_raw = exchange_rate - WAD;
    wad_mul(
        rate_raw,
        (period_size as i128) * WAD / (time_to_maturity as i128),
    )
}

pub fn get_dynamic_scalar(scalar_root: i128, period_size: u64, ttm: u64) -> i128 {
    assert!(ttm > 0, "time to maturity must be positive");
    scalar_root * (period_size as i128) / (ttm as i128)
}

pub fn get_dynamic_fee(fee_root: i128, period_size: u64, ttm: u64) -> i128 {
    assert!(period_size > 0, "period size must be positive");
    fee_root * (ttm as i128) / (period_size as i128)
}

pub fn update_anchor(
    current_ex_rate: i128,
    last_implied_rate: i128,
    anchor: i128,
    period_size: u64,
    ttm: u64,
) -> i128 {
    assert!(period_size > 0, "period size must be positive");
    assert!(ttm > 0, "time to maturity must be positive");

    let desired_exchange_rate = WAD + last_implied_rate * (ttm as i128) / (period_size as i128);
    desired_exchange_rate - (current_ex_rate - anchor)
}

pub fn calc_sy_for_exact_pt(
    total_pt: i128,
    total_sy: i128,
    pt_out: i128,
    scalar: i128,
    anchor: i128,
    fee: i128,
) -> i128 {
    assert!(pt_out >= 0, "PT out must be non-negative");
    if pt_out == 0 {
        return 0;
    }

    let new_total_pt = total_pt - pt_out;
    assert!(new_total_pt > 0, "insufficient PT");

    let proportion = wad_div(new_total_pt, total_pt + total_sy);
    assert!(
        proportion > WAD / 100 && proportion < WAD * 99 / 100,
        "proportion out of bounds"
    );

    let trade_rate = wad_div(logit(proportion), scalar) + anchor - fee;
    assert!(trade_rate > 0, "trade rate must be positive");
    wad_div(pt_out, trade_rate)
}

pub fn calc_pt_for_exact_sy(
    total_pt: i128,
    total_sy: i128,
    sy_in: i128,
    scalar: i128,
    anchor: i128,
    fee: i128,
) -> i128 {
    assert!(sy_in >= 0, "SY in must be non-negative");
    if sy_in == 0 {
        return 0;
    }

    let pool_total = total_pt + total_sy;
    let min_pt_after_bound = pool_total / 100 + WAD;
    let max_out_by_bound = total_pt - min_pt_after_bound;
    let max_out_by_liquidity = total_pt * 99 / 100;
    let mut lo = 0i128;
    let mut hi = min(max_out_by_bound, max_out_by_liquidity);
    let mut best = 0i128;

    while lo <= hi {
        let mid = lo + (hi - lo) / 2;
        let sy_needed = calc_sy_for_exact_pt(total_pt, total_sy, mid, scalar, anchor, fee);

        if sy_needed <= sy_in {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    best
}
