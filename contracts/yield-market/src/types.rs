use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketConfig {
    pub admin: Address,
    pub splitter: Address,
    pub sy_token: Address,
    pub pt_token: Address,
    pub lp_token: Address,
    pub maturity: u64,
}
