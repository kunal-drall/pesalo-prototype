use crate::constants::WAD;

pub fn wad_mul(a: i128, b: i128) -> i128 {
    a.checked_mul(b).expect("multiplication overflow") / WAD
}

pub fn wad_mul_up(a: i128, b: i128) -> i128 {
    let product = a.checked_mul(b).expect("multiplication overflow");
    let quotient = product / WAD;
    let remainder = product % WAD;

    if remainder == 0 {
        quotient
    } else if product > 0 {
        quotient + 1
    } else {
        quotient - 1
    }
}

pub fn wad_div(a: i128, b: i128) -> i128 {
    mul_div(a, WAD, b)
}

pub fn wad_div_up(a: i128, b: i128) -> i128 {
    mul_div_up(a, WAD, b)
}

pub fn wad_pow(mut base: i128, mut exp: u32) -> i128 {
    let mut result = WAD;

    while exp > 0 {
        if exp & 1 == 1 {
            result = wad_mul(result, base);
        }
        exp >>= 1;
        if exp > 0 {
            base = wad_mul(base, base);
        }
    }

    result
}

pub fn mul_div(a: i128, b: i128, c: i128) -> i128 {
    let (negative, quotient, _) = div_product(a, b, c);
    apply_sign(quotient, negative)
}

pub fn mul_div_up(a: i128, b: i128, c: i128) -> i128 {
    let (negative, quotient, remainder) = div_product(a, b, c);
    let rounded = if remainder == 0 {
        quotient
    } else {
        quotient + 1
    };

    apply_sign(rounded, negative)
}

pub fn abs(x: i128) -> i128 {
    x.checked_abs().expect("absolute value overflow")
}

pub fn min(a: i128, b: i128) -> i128 {
    if a < b {
        a
    } else {
        b
    }
}

pub fn max(a: i128, b: i128) -> i128 {
    if a > b {
        a
    } else {
        b
    }
}

pub fn clamp(x: i128, lo: i128, hi: i128) -> i128 {
    assert!(lo <= hi, "invalid clamp bounds");
    max(lo, min(x, hi))
}

fn div_product(a: i128, b: i128, c: i128) -> (bool, i128, i128) {
    assert!(c != 0, "division by zero");

    let negative = (a < 0) ^ (b < 0) ^ (c < 0);
    let mut x = abs(a);
    let mut y = abs(b);
    let mut z = abs(c);

    let gcd_xz = gcd(x, z);
    x /= gcd_xz;
    z /= gcd_xz;

    let gcd_yz = gcd(y, z);
    y /= gcd_yz;
    z /= gcd_yz;

    if let Some(numerator) = x.checked_mul(y) {
        return (negative, numerator / z, numerator % z);
    }

    let whole = x / z;
    let remainder = x % z;
    let whole_value = whole.checked_mul(y).expect("multiplication overflow");
    let remainder_product = remainder.checked_mul(y).expect("multiplication overflow");

    (
        negative,
        whole_value + remainder_product / z,
        remainder_product % z,
    )
}

fn apply_sign(value: i128, negative: bool) -> i128 {
    if negative {
        value.checked_neg().expect("negation overflow")
    } else {
        value
    }
}

fn gcd(mut a: i128, mut b: i128) -> i128 {
    while b != 0 {
        let r = a % b;
        a = b;
        b = r;
    }

    if a == 0 {
        1
    } else {
        a
    }
}
