use crate::constants::WAD;
use crate::logit::{logit, sigmoid};
use crate::tests::assert_approx;

const TOL: i128 = 50_000_000;

#[test]
fn logit_half_is_zero() {
    assert_approx(logit(WAD / 2), 0, 1);
}

#[test]
fn logit_quarter() {
    assert_approx(logit(WAD / 4), -1_098_612_288_668_109_692, TOL);
}

#[test]
fn logit_three_quarters() {
    assert_approx(logit(3 * WAD / 4), 1_098_612_288_668_109_691, TOL);
}

#[test]
fn logit_one_tenth() {
    assert_approx(logit(WAD / 10), -2_197_224_577_336_219_383, TOL);
}

#[test]
fn logit_nine_tenths() {
    assert_approx(logit(9 * WAD / 10), 2_197_224_577_336_219_382, TOL);
}

#[test]
fn logit_is_antisymmetric_quarter() {
    assert_approx(logit(WAD / 4), -logit(3 * WAD / 4), TOL);
}

#[test]
fn logit_is_antisymmetric_tenth() {
    assert_approx(logit(WAD / 10), -logit(9 * WAD / 10), TOL);
}

#[test]
fn sigmoid_zero_is_half() {
    assert_approx(sigmoid(0), WAD / 2, 1);
}

#[test]
fn sigmoid_one() {
    assert_approx(sigmoid(WAD), 731_058_578_630_004_879, TOL);
}

#[test]
fn sigmoid_negative_one() {
    assert_approx(sigmoid(-WAD), 268_941_421_369_995_120, TOL);
}

#[test]
fn sigmoid_two() {
    assert_approx(sigmoid(2 * WAD), 880_797_077_977_882_444, TOL);
}

#[test]
fn sigmoid_negative_two() {
    assert_approx(sigmoid(-2 * WAD), 119_202_922_022_117_555, TOL);
}

#[test]
fn sigmoid_logit_roundtrip_quarter() {
    assert_approx(sigmoid(logit(WAD / 4)), WAD / 4, TOL);
}

#[test]
fn sigmoid_logit_roundtrip_three_quarters() {
    assert_approx(sigmoid(logit(3 * WAD / 4)), 3 * WAD / 4, TOL);
}

#[test]
fn sigmoid_saturates_high() {
    assert_eq!(sigmoid(60 * WAD), WAD);
}

#[test]
fn sigmoid_saturates_low() {
    assert_eq!(sigmoid(-60 * WAD), 0);
}

#[test]
#[should_panic(expected = "probability out of bounds")]
fn logit_panics_on_zero() {
    let _ = logit(0);
}

#[test]
#[should_panic(expected = "probability out of bounds")]
fn logit_panics_on_one() {
    let _ = logit(WAD);
}
