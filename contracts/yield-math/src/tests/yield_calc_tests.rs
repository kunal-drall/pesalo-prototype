use crate::constants::WAD;
use crate::tests::assert_approx;
use crate::yield_calc::{
    accrued_yield, fixed_apy_from_pt_price, pt_price_from_rate, yt_price_from_pt,
};

#[test]
fn fixed_apy_from_par_is_zero() {
    assert_eq!(fixed_apy_from_pt_price(WAD, 90), 0);
}

#[test]
fn fixed_apy_from_discounted_price() {
    assert_approx(
        fixed_apy_from_pt_price(982_500_000_000_000_000, 90),
        72_236_358_495_900_480,
        5,
    );
}

#[test]
fn fixed_apy_from_deeper_discount() {
    assert_approx(
        fixed_apy_from_pt_price(950_000_000_000_000_000, 180),
        106_725_146_198_830_409,
        5,
    );
}

#[test]
fn fixed_apy_scales_with_shorter_expiry() {
    let thirty = fixed_apy_from_pt_price(990_000_000_000_000_000, 30);
    let sixty = fixed_apy_from_pt_price(990_000_000_000_000_000, 60);
    assert!(thirty > sixty);
}

#[test]
fn pt_price_from_zero_rate_is_par() {
    assert_eq!(pt_price_from_rate(0, 90), WAD);
}

#[test]
fn pt_price_from_rate_usdc_example() {
    assert_approx(
        pt_price_from_rate(72_000_000_000_000_000, 90),
        982_556_261_440_723_592,
        2,
    );
}

#[test]
fn pt_price_from_rate_year() {
    assert_approx(
        pt_price_from_rate(120_000_000_000_000_000, 365),
        892_857_142_857_142_857,
        2,
    );
}

#[test]
fn pt_price_from_rate_eurc_example() {
    assert_approx(
        pt_price_from_rate(58_000_000_000_000_000, 90),
        985_900_275_511_857_814,
        2,
    );
}

#[test]
fn pt_price_decreases_as_rate_increases() {
    let low = pt_price_from_rate(5 * WAD / 100, 90);
    let high = pt_price_from_rate(10 * WAD / 100, 90);
    assert!(high < low);
}

#[test]
fn pt_price_decreases_as_days_increase() {
    let short = pt_price_from_rate(7 * WAD / 100, 30);
    let long = pt_price_from_rate(7 * WAD / 100, 180);
    assert!(long < short);
}

#[test]
fn rate_price_roundtrip() {
    let rate = 72_000_000_000_000_000;
    let price = pt_price_from_rate(rate, 90);
    assert_approx(fixed_apy_from_pt_price(price, 90), rate, 100);
}

#[test]
fn yt_price_from_pt_at_par_is_zero() {
    assert_eq!(yt_price_from_pt(WAD), 0);
}

#[test]
fn yt_price_from_pt_discount() {
    assert_eq!(
        yt_price_from_pt(950_000_000_000_000_000),
        50_000_000_000_000_000
    );
}

#[test]
fn yt_price_from_zero_pt_is_one() {
    assert_eq!(yt_price_from_pt(0), WAD);
}

#[test]
fn accrued_yield_zero_when_rate_unchanged() {
    assert_eq!(accrued_yield(100 * WAD, WAD, WAD), 0);
}

#[test]
fn accrued_yield_zero_when_rate_falls() {
    assert_eq!(accrued_yield(100 * WAD, 105 * WAD / 100, WAD), 0);
}

#[test]
fn accrued_yield_on_rate_increase() {
    assert_eq!(accrued_yield(100 * WAD, WAD, 105 * WAD / 100), 5 * WAD);
}

#[test]
fn accrued_yield_fractional() {
    assert_eq!(accrued_yield(250 * WAD, WAD, 101 * WAD / 100), 5 * WAD / 2);
}

#[test]
#[should_panic(expected = "PT price must be positive")]
fn fixed_apy_panics_on_zero_price() {
    let _ = fixed_apy_from_pt_price(0, 90);
}

#[test]
#[should_panic(expected = "days to expiry must be positive")]
fn fixed_apy_panics_on_zero_days() {
    let _ = fixed_apy_from_pt_price(WAD, 0);
}

#[test]
#[should_panic(expected = "PT price out of bounds")]
fn yt_price_panics_above_par() {
    let _ = yt_price_from_pt(WAD + 1);
}
