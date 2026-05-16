use crate::constants::WAD;
use crate::wad::{wad_div, wad_mul};

pub fn fixed_apy_from_pt_price(pt_price: i128, days_to_expiry: u64) -> i128 {
    assert!(pt_price > 0, "PT price must be positive");
    assert!(days_to_expiry > 0, "days to expiry must be positive");

    let discount = wad_div(WAD, pt_price) - WAD;
    discount * 365 / (days_to_expiry as i128)
}

pub fn pt_price_from_rate(rate: i128, days: u64) -> i128 {
    assert!(days > 0, "days must be positive");

    let term = rate * (days as i128) / 365;
    assert!(WAD + term > 0, "rate makes price invalid");
    wad_div(WAD, WAD + term)
}

pub fn yt_price_from_pt(pt_price: i128) -> i128 {
    assert!(pt_price >= 0 && pt_price <= WAD, "PT price out of bounds");
    WAD - pt_price
}

pub fn accrued_yield(sy_amount: i128, old_rate: i128, new_rate: i128) -> i128 {
    assert!(sy_amount >= 0, "SY amount must be non-negative");
    assert!(old_rate > 0 && new_rate > 0, "rates must be positive");

    if new_rate <= old_rate {
        return 0;
    }

    wad_mul(sy_amount, new_rate - old_rate)
}
