use crate::constants::WAD;
use crate::wad::{
    abs, clamp, max, min, mul_div, mul_div_up, wad_div, wad_div_up, wad_mul, wad_mul_up, wad_pow,
};

#[test]
fn wad_mul_zero_left() {
    assert_eq!(wad_mul(0, WAD), 0);
}

#[test]
fn wad_mul_zero_right() {
    assert_eq!(wad_mul(WAD, 0), 0);
}

#[test]
fn wad_mul_identity() {
    assert_eq!(wad_mul(WAD, 7 * WAD), 7 * WAD);
}

#[test]
fn wad_mul_fraction() {
    assert_eq!(wad_mul(WAD / 2, WAD / 2), WAD / 4);
}

#[test]
fn wad_mul_negative() {
    assert_eq!(wad_mul(-2 * WAD, WAD / 2), -WAD);
}

#[test]
fn wad_mul_double_negative() {
    assert_eq!(wad_mul(-3 * WAD, -2 * WAD), 6 * WAD);
}

#[test]
fn wad_mul_rounds_toward_zero() {
    assert_eq!(wad_mul(1, WAD / 2), 0);
}

#[test]
fn wad_mul_up_rounds_positive_away() {
    assert_eq!(wad_mul_up(1, WAD / 2), 1);
}

#[test]
fn wad_mul_up_rounds_negative_away() {
    assert_eq!(wad_mul_up(-1, WAD / 2), -1);
}

#[test]
fn wad_div_identity() {
    assert_eq!(wad_div(9 * WAD, WAD), 9 * WAD);
}

#[test]
fn wad_div_half() {
    assert_eq!(wad_div(WAD, 2 * WAD), WAD / 2);
}

#[test]
fn wad_div_negative() {
    assert_eq!(wad_div(-WAD, 2 * WAD), -WAD / 2);
}

#[test]
fn wad_div_rounds_toward_zero() {
    assert_eq!(wad_div(1, 2 * WAD), 0);
}

#[test]
fn wad_div_up_rounds_positive_away() {
    assert_eq!(wad_div_up(1, 2 * WAD), 1);
}

#[test]
fn wad_div_up_rounds_negative_away() {
    assert_eq!(wad_div_up(-1, 2 * WAD), -1);
}

#[test]
fn wad_pow_zero_exp() {
    assert_eq!(wad_pow(7 * WAD, 0), WAD);
}

#[test]
fn wad_pow_one_exp() {
    assert_eq!(wad_pow(7 * WAD, 1), 7 * WAD);
}

#[test]
fn wad_pow_square() {
    assert_eq!(wad_pow(2 * WAD, 2), 4 * WAD);
}

#[test]
fn wad_pow_cube_fraction() {
    assert_eq!(wad_pow(WAD / 2, 3), WAD / 8);
}

#[test]
fn wad_pow_negative_odd() {
    assert_eq!(wad_pow(-2 * WAD, 3), -8 * WAD);
}

#[test]
fn wad_pow_negative_even() {
    assert_eq!(wad_pow(-2 * WAD, 4), 16 * WAD);
}

#[test]
fn mul_div_basic() {
    assert_eq!(mul_div(6, 7, 3), 14);
}

#[test]
fn mul_div_preserves_sign() {
    assert_eq!(mul_div(-6, 7, 3), -14);
    assert_eq!(mul_div(-6, -7, 3), 14);
}

#[test]
fn mul_div_reduces_before_multiply() {
    assert_eq!(mul_div(20 * WAD, 20 * WAD, WAD), 400 * WAD);
}

#[test]
fn mul_div_up_rounds() {
    assert_eq!(mul_div_up(10, 10, 6), 17);
}

#[test]
fn mul_div_up_negative_rounds() {
    assert_eq!(mul_div_up(-10, 10, 6), -17);
}

#[test]
fn abs_positive() {
    assert_eq!(abs(123), 123);
}

#[test]
fn abs_negative() {
    assert_eq!(abs(-123), 123);
}

#[test]
fn min_selects_lower() {
    assert_eq!(min(-1, 2), -1);
}

#[test]
fn max_selects_higher() {
    assert_eq!(max(-1, 2), 2);
}

#[test]
fn clamp_inside() {
    assert_eq!(clamp(5, 1, 10), 5);
}

#[test]
fn clamp_low() {
    assert_eq!(clamp(-5, 1, 10), 1);
}

#[test]
fn clamp_high() {
    assert_eq!(clamp(50, 1, 10), 10);
}

#[test]
#[should_panic(expected = "division by zero")]
fn wad_div_panics_on_zero_denominator() {
    let _ = wad_div(WAD, 0);
}

#[test]
#[should_panic(expected = "multiplication overflow")]
fn wad_mul_panics_on_overflow() {
    let _ = wad_mul(20 * WAD, 20 * WAD);
}

#[test]
#[should_panic(expected = "invalid clamp bounds")]
fn clamp_panics_on_invalid_bounds() {
    let _ = clamp(5, 10, 1);
}
