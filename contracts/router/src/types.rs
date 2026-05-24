use soroban_sdk::{contracttype, Address};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BoostResult {
    /// PT tokens minted into the user's wallet (locked principal until
    /// maturity, redeemable for the underlying value).
    pub pt_amount: i128,
    /// SY tokens sent back to the user from the YT sale (this is the
    /// "upfront yield" that materialises into the user's auto-earn
    /// balance immediately).
    pub upfront_yield_sy: i128,
    /// Annualised fixed rate locked, in WAD (1.0 == 100%).
    pub boost_rate_wad: i128,
    pub maturity: u64,
}
