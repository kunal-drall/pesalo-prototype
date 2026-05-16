use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RateInfo {
    pub asset: String,
    pub market: Address,
    pub maturity: u64,
    pub fixed_apy_wad: i128,
}
