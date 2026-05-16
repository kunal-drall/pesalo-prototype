use soroban_sdk::{contracttype, Address, String};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RateInfo {
    pub asset: String,
    pub market: Address,
    pub maturity: u64,
    pub fixed_apy_wad: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FixedDepositResult {
    pub pt_minted: i128,
    pub yield_underlying: i128,
    pub maturity: u64,
}
