use crate::constants::WAD;
use crate::logit::{logit, sigmoid};
use crate::tests::assert_approx;
use crate::transcendental::{exp_wad, ln_wad, sqrt_wad};
use crate::yield_calc::{fixed_apy_from_pt_price, pt_price_from_rate};

const STRICT: i128 = 5_000_000;
const NORMAL: i128 = 100_000_000;
const EXP2_TOL: i128 = 250_000_000;

#[test]
fn python_vector_ln_point_one() {
    assert_approx(ln_wad(WAD / 10), -2_302_585_092_994_045_685, NORMAL);
}

#[test]
fn python_vector_ln_point_two_five() {
    assert_approx(ln_wad(WAD / 4), -1_386_294_361_119_890_619, NORMAL);
}

#[test]
fn python_vector_ln_point_seven_five() {
    assert_approx(ln_wad(3 * WAD / 4), -287_682_072_451_780_928, STRICT);
}

#[test]
fn python_vector_ln_one_point_five() {
    assert_approx(ln_wad(3 * WAD / 2), 405_465_108_108_164_381, STRICT);
}

#[test]
fn python_vector_ln_ten() {
    assert_approx(ln_wad(10 * WAD), 2_302_585_092_994_045_684, NORMAL);
}

#[test]
fn python_vector_exp_negative_two() {
    assert_approx(exp_wad(-2 * WAD), 135_335_283_236_612_691, NORMAL);
}

#[test]
fn python_vector_exp_negative_one() {
    assert_approx(exp_wad(-WAD), 367_879_441_171_442_321, NORMAL);
}

#[test]
fn python_vector_exp_half() {
    assert_approx(exp_wad(WAD / 2), 1_648_721_270_700_128_146, NORMAL);
}

#[test]
fn python_vector_exp_two() {
    assert_approx(exp_wad(2 * WAD), 7_389_056_098_930_650_227, EXP2_TOL);
}

#[test]
fn python_vector_sqrt_two() {
    assert_approx(sqrt_wad(2 * WAD), 1_414_213_562_373_095_048, NORMAL);
}

#[test]
fn python_vector_sqrt_ten() {
    assert_approx(sqrt_wad(10 * WAD), 3_162_277_660_168_379_331, NORMAL);
}

#[test]
fn python_vector_logit_point_one() {
    assert_approx(logit(WAD / 10), -2_197_224_577_336_219_383, NORMAL);
}

#[test]
fn python_vector_logit_point_nine() {
    assert_approx(logit(9 * WAD / 10), 2_197_224_577_336_219_382, NORMAL);
}

#[test]
fn python_vector_sigmoid_negative_two() {
    assert_approx(sigmoid(-2 * WAD), 119_202_922_022_117_555, NORMAL);
}

#[test]
fn python_vector_sigmoid_two() {
    assert_approx(sigmoid(2 * WAD), 880_797_077_977_882_444, NORMAL);
}

#[test]
fn python_vector_fixed_apy_from_pt_price() {
    assert_approx(
        fixed_apy_from_pt_price(982_500_000_000_000_000, 90),
        72_236_358_495_900_480,
        5,
    );
}

#[test]
fn python_vector_pt_price_from_rate() {
    assert_approx(
        pt_price_from_rate(72_000_000_000_000_000, 90),
        982_556_261_440_723_592,
        2,
    );
}
