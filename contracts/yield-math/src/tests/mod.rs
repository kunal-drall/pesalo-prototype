mod amm_tests;
mod cross_validation;
mod logit_tests;
mod transcendental_tests;
mod wad_tests;
mod yield_calc_tests;

pub fn assert_approx(actual: i128, expected: i128, tolerance: i128) {
    let diff = if actual >= expected {
        actual - expected
    } else {
        expected - actual
    };

    assert!(
        diff <= tolerance,
        "actual={actual} expected={expected} diff={diff} tolerance={tolerance}"
    );
}
