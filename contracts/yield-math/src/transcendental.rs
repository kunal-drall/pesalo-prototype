use crate::constants::{LN2, WAD};
use crate::wad::{wad_div, wad_mul};

const LN_TERMS: u32 = 18;
const EXP_TERMS: u32 = 20;

pub fn ln_wad(x: i128) -> i128 {
    assert!(x > 0, "ln input must be positive");

    let mut y = x;
    let mut n = 0i128;

    while y < WAD {
        y = y.checked_mul(2).expect("ln normalization overflow");
        n -= 1;
    }

    while y >= 2 * WAD {
        y /= 2;
        n += 1;
    }

    n * LN2 + ln_near_one_wad(y)
}

pub fn exp_wad(x: i128) -> i128 {
    if x == 0 {
        return WAD;
    }

    let n = x / LN2;
    let r = x - n * LN2;
    let mut term = WAD;
    let mut sum = WAD;

    for i in 1..=EXP_TERMS {
        term = wad_mul(term, r) / (i as i128);
        sum += term;
        if term == 0 {
            break;
        }
    }

    scale_by_power_of_two(sum, n)
}

pub fn sqrt_wad(x: i128) -> i128 {
    assert!(x >= 0, "sqrt input must be non-negative");
    if x == 0 {
        return 0;
    }

    let mut guess = if x >= WAD { x } else { WAD };
    for _ in 0..20 {
        guess = (guess + wad_div(x, guess)) / 2;
    }

    guess
}

fn ln_near_one_wad(y: i128) -> i128 {
    let t = wad_div(y - WAD, y + WAD);
    let t2 = wad_mul(t, t);
    let mut term = t;
    let mut sum = term;

    for i in 1..LN_TERMS {
        term = wad_mul(term, t2);
        sum += term / (2 * (i as i128) + 1);
    }

    2 * sum
}

fn scale_by_power_of_two(mut value: i128, n: i128) -> i128 {
    if n > 0 {
        for _ in 0..n {
            value = value.checked_mul(2).expect("exp overflow");
        }
    } else {
        for _ in 0..(-n) {
            value /= 2;
        }
    }

    value
}
