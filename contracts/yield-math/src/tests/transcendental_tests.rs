use crate::constants::{E, LN2, WAD};
use crate::tests::assert_approx;
use crate::transcendental::{exp_wad, ln_wad, sqrt_wad};
use crate::wad::wad_div;

const TOL: i128 = 5_000_000;
const LOOSE_TOL: i128 = 50_000_000;

#[test]
fn ln_one_is_zero() {
    assert_eq!(ln_wad(WAD), 0);
}

#[test]
fn ln_two_matches_constant() {
    assert_approx(ln_wad(2 * WAD), LN2, TOL);
}

#[test]
fn ln_e_is_one() {
    assert_approx(ln_wad(E), WAD, TOL);
}

#[test]
fn ln_half_is_negative_ln_two() {
    assert_approx(ln_wad(WAD / 2), -LN2, TOL);
}

#[test]
fn ln_quarter_is_negative_two_ln_two() {
    assert_approx(ln_wad(WAD / 4), -2 * LN2, TOL);
}

#[test]
fn ln_three_halves() {
    assert_approx(ln_wad(3 * WAD / 2), 405_465_108_108_164_381, TOL);
}

#[test]
fn ln_five_quarters() {
    assert_approx(ln_wad(5 * WAD / 4), 223_143_551_314_209_755, TOL);
}

#[test]
fn ln_three_quarters() {
    assert_approx(ln_wad(3 * WAD / 4), -287_682_072_451_780_928, TOL);
}

#[test]
fn ln_ten() {
    assert_approx(ln_wad(10 * WAD), 2_302_585_092_994_045_684, LOOSE_TOL);
}

#[test]
fn exp_zero_is_one() {
    assert_eq!(exp_wad(0), WAD);
}

#[test]
fn exp_one_matches_e() {
    assert_approx(exp_wad(WAD), E, TOL);
}

#[test]
fn exp_ln_two_is_two() {
    assert_approx(exp_wad(LN2), 2 * WAD, TOL);
}

#[test]
fn exp_negative_ln_two_is_half() {
    assert_approx(exp_wad(-LN2), WAD / 2, TOL);
}

#[test]
fn exp_half() {
    assert_approx(exp_wad(WAD / 2), 1_648_721_270_700_128_146, LOOSE_TOL);
}

#[test]
fn exp_negative_half() {
    assert_approx(exp_wad(-WAD / 2), 606_530_659_712_633_423, LOOSE_TOL);
}

#[test]
fn exp_two() {
    assert_approx(exp_wad(2 * WAD), 7_389_056_098_930_650_227, 250_000_000);
}

#[test]
fn sqrt_zero() {
    assert_eq!(sqrt_wad(0), 0);
}

#[test]
fn sqrt_one() {
    assert_approx(sqrt_wad(WAD), WAD, TOL);
}

#[test]
fn sqrt_quarter() {
    assert_approx(sqrt_wad(WAD / 4), WAD / 2, TOL);
}

#[test]
fn sqrt_hundredth() {
    assert_approx(sqrt_wad(WAD / 100), WAD / 10, TOL);
}

#[test]
fn sqrt_two() {
    assert_approx(sqrt_wad(2 * WAD), 1_414_213_562_373_095_048, LOOSE_TOL);
}

#[test]
fn sqrt_ten() {
    assert_approx(sqrt_wad(10 * WAD), 3_162_277_660_168_379_331, 100_000_000);
}

#[test]
fn exp_ln_roundtrip_one_tenth() {
    assert_approx(exp_wad(ln_wad(WAD / 10)), WAD / 10, 100_000_000);
}

#[test]
fn exp_ln_roundtrip_half() {
    assert_approx(exp_wad(ln_wad(WAD / 2)), WAD / 2, 100_000_000);
}

#[test]
fn exp_ln_roundtrip_one() {
    assert_approx(exp_wad(ln_wad(WAD)), WAD, TOL);
}

#[test]
fn exp_ln_roundtrip_one_point_two_five() {
    assert_approx(exp_wad(ln_wad(5 * WAD / 4)), 5 * WAD / 4, 100_000_000);
}

#[test]
fn exp_ln_roundtrip_two() {
    assert_approx(exp_wad(ln_wad(2 * WAD)), 2 * WAD, 100_000_000);
}

#[test]
fn exp_ln_roundtrip_five() {
    assert_approx(exp_wad(ln_wad(5 * WAD)), 5 * WAD, 500_000_000);
}

#[test]
fn ln_exp_roundtrip_negative_one() {
    assert_approx(ln_wad(exp_wad(-WAD)), -WAD, 100_000_000);
}

#[test]
fn ln_exp_roundtrip_half() {
    assert_approx(ln_wad(exp_wad(WAD / 2)), WAD / 2, 100_000_000);
}

#[test]
fn sqrt_result_squares_back() {
    let value = 7 * WAD / 3;
    let root = sqrt_wad(value);
    assert_approx(crate::wad::wad_mul(root, root), value, 100_000_000);
}

#[test]
fn ln_is_monotonic() {
    assert!(ln_wad(2 * WAD) > ln_wad(WAD));
    assert!(ln_wad(WAD) > ln_wad(wad_div(WAD, 2 * WAD)));
}

#[test]
fn exp_is_monotonic() {
    assert!(exp_wad(WAD) > exp_wad(0));
    assert!(exp_wad(0) > exp_wad(-WAD));
}

#[test]
#[should_panic(expected = "ln input must be positive")]
fn ln_panics_on_zero() {
    let _ = ln_wad(0);
}

#[test]
#[should_panic(expected = "sqrt input must be non-negative")]
fn sqrt_panics_on_negative() {
    let _ = sqrt_wad(-1);
}
