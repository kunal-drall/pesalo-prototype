use crate::amm::{
    calc_pt_for_exact_sy, calc_sy_for_exact_pt, get_dynamic_fee, get_dynamic_scalar,
    get_exchange_rate, get_implied_rate, update_anchor,
};
use crate::constants::WAD;
use crate::tests::assert_approx;

const TOTAL_PT: i128 = 500_000 * WAD;
const TOTAL_SY: i128 = 500_000 * WAD;
const SCALAR: i128 = 80 * WAD;
const ANCHOR: i128 = 1_025_000_000_000_000_000;
const FEE: i128 = WAD / 1_000;
const PERIOD: u64 = 31_536_000;
const QUARTER: u64 = 7_884_000;

#[test]
fn exchange_rate_balanced_pool_equals_anchor() {
    assert_approx(
        get_exchange_rate(TOTAL_PT, TOTAL_SY, SCALAR, ANCHOR),
        ANCHOR,
        1,
    );
}

#[test]
fn exchange_rate_rises_when_pt_share_rises() {
    let rate = get_exchange_rate(600_000 * WAD, 400_000 * WAD, SCALAR, ANCHOR);
    assert!(rate > ANCHOR);
}

#[test]
fn exchange_rate_falls_when_pt_share_falls() {
    let rate = get_exchange_rate(400_000 * WAD, 600_000 * WAD, SCALAR, ANCHOR);
    assert!(rate < ANCHOR);
}

#[test]
fn implied_rate_one_year() {
    assert_eq!(
        get_implied_rate(105 * WAD / 100, PERIOD, PERIOD),
        5 * WAD / 100
    );
}

#[test]
fn implied_rate_scales_with_shorter_maturity() {
    assert_eq!(
        get_implied_rate(105 * WAD / 100, PERIOD, PERIOD / 2),
        WAD / 10
    );
}

#[test]
fn implied_rate_can_be_negative() {
    assert_eq!(
        get_implied_rate(98 * WAD / 100, PERIOD, PERIOD),
        -2 * WAD / 100
    );
}

#[test]
fn dynamic_scalar_equals_root_at_full_period() {
    assert_eq!(get_dynamic_scalar(SCALAR, PERIOD, PERIOD), SCALAR);
}

#[test]
fn dynamic_scalar_doubles_at_half_period() {
    assert_eq!(get_dynamic_scalar(SCALAR, PERIOD, PERIOD / 2), 2 * SCALAR);
}

#[test]
fn dynamic_scalar_halves_at_double_period() {
    assert_eq!(get_dynamic_scalar(SCALAR, PERIOD, 2 * PERIOD), SCALAR / 2);
}

#[test]
fn dynamic_fee_equals_root_at_full_period() {
    assert_eq!(get_dynamic_fee(FEE, PERIOD, PERIOD), FEE);
}

#[test]
fn dynamic_fee_halves_at_half_period() {
    assert_eq!(get_dynamic_fee(FEE, PERIOD, PERIOD / 2), FEE / 2);
}

#[test]
fn dynamic_fee_doubles_at_double_period() {
    assert_eq!(get_dynamic_fee(FEE, PERIOD, 2 * PERIOD), 2 * FEE);
}

#[test]
fn update_anchor_preserves_implied_rate() {
    let last_implied = 7 * WAD / 100;
    let current = ANCHOR + WAD / 100;
    let next_anchor = update_anchor(current, last_implied, ANCHOR, PERIOD, QUARTER);
    let next_exchange = current - ANCHOR + next_anchor;

    assert_approx(
        get_implied_rate(next_exchange, PERIOD, QUARTER),
        last_implied,
        4,
    );
}

#[test]
fn sy_for_zero_pt_is_zero() {
    assert_eq!(
        calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, 0, SCALAR, ANCHOR, FEE),
        0
    );
}

#[test]
fn sy_for_exact_pt_is_positive() {
    assert!(calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, 1_000 * WAD, SCALAR, ANCHOR, FEE) > 0);
}

#[test]
fn sy_for_exact_pt_monotonic() {
    let small = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, 1_000 * WAD, SCALAR, ANCHOR, FEE);
    let large = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, 2_000 * WAD, SCALAR, ANCHOR, FEE);
    assert!(large > small);
}

#[test]
fn sy_for_exact_pt_increases_with_fee() {
    let low_fee = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, 1_000 * WAD, SCALAR, ANCHOR, 0);
    let high_fee = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, 1_000 * WAD, SCALAR, ANCHOR, FEE);
    assert!(high_fee > low_fee);
}

#[test]
fn pt_for_zero_sy_is_zero() {
    assert_eq!(
        calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, 0, SCALAR, ANCHOR, FEE),
        0
    );
}

#[test]
fn pt_for_exact_sy_is_positive() {
    assert!(calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, 1_000 * WAD, SCALAR, ANCHOR, FEE) > 0);
}

#[test]
fn pt_for_exact_sy_monotonic() {
    let small = calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, 1_000 * WAD, SCALAR, ANCHOR, FEE);
    let large = calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, 2_000 * WAD, SCALAR, ANCHOR, FEE);
    assert!(large > small);
}

#[test]
fn pt_for_exact_sy_respects_budget() {
    let budget = 5_000 * WAD;
    let pt_out = calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, budget, SCALAR, ANCHOR, FEE);
    let sy_needed = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, pt_out, SCALAR, ANCHOR, FEE);

    assert!(sy_needed <= budget);
}

#[test]
fn pt_for_exact_sy_almost_inverts_sy_for_exact_pt() {
    let pt_out = 3_000 * WAD;
    let sy_needed = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, pt_out, SCALAR, ANCHOR, FEE);
    let recovered = calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, sy_needed, SCALAR, ANCHOR, FEE);

    assert!(recovered >= pt_out - 1);
}

#[test]
fn pt_for_exact_sy_stays_below_pool_bounds() {
    let pt_out = calc_pt_for_exact_sy(TOTAL_PT, TOTAL_SY, 1_000_000 * WAD, SCALAR, ANCHOR, FEE);
    assert!(pt_out < TOTAL_PT);
}

#[test]
fn exchange_rate_changes_with_scalar() {
    let low_scalar = get_exchange_rate(600_000 * WAD, 400_000 * WAD, 40 * WAD, ANCHOR);
    let high_scalar = get_exchange_rate(600_000 * WAD, 400_000 * WAD, 160 * WAD, ANCHOR);
    assert!(low_scalar > high_scalar);
}

#[test]
fn exchange_rate_changes_with_anchor() {
    let rate = get_exchange_rate(TOTAL_PT, TOTAL_SY, SCALAR, ANCHOR + WAD / 100);
    assert_approx(rate, ANCHOR + WAD / 100, 1);
}

#[test]
#[should_panic(expected = "pool totals must be positive")]
fn exchange_rate_panics_on_empty_pool() {
    let _ = get_exchange_rate(0, TOTAL_SY, SCALAR, ANCHOR);
}

#[test]
#[should_panic(expected = "time to maturity must be positive")]
fn implied_rate_panics_on_zero_ttm() {
    let _ = get_implied_rate(WAD, PERIOD, 0);
}

#[test]
#[should_panic(expected = "insufficient PT")]
fn sy_for_exact_pt_panics_on_insufficient_pt() {
    let _ = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, TOTAL_PT, SCALAR, ANCHOR, FEE);
}

#[test]
#[should_panic(expected = "proportion out of bounds")]
fn sy_for_exact_pt_panics_outside_bounds() {
    let _ = calc_sy_for_exact_pt(TOTAL_PT, TOTAL_SY, TOTAL_PT * 99 / 100, SCALAR, ANCHOR, FEE);
}
