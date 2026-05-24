use crate::constants::WAD;
use crate::transcendental::{exp_wad, ln_wad};
use crate::wad::wad_div;

const SIGMOID_LIMIT: i128 = 60 * WAD;

pub fn logit(p: i128) -> i128 {
    assert!(p > 0 && p < WAD, "probability out of bounds");
    ln_wad(wad_div(p, WAD - p))
}

pub fn sigmoid(x: i128) -> i128 {
    if x >= SIGMOID_LIMIT {
        return WAD;
    }
    if x <= -SIGMOID_LIMIT {
        return 0;
    }

    let denominator = WAD + exp_wad(-x);
    wad_div(WAD, denominator)
}
