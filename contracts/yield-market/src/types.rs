use soroban_sdk::{contracttype, Address};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    SyToken,
    Splitter,
    Maturity,
    CreatedAt,
    PeriodSize,
    ScalarRoot,
    FeeRateRoot,
    Anchor,
    LastImpliedRate,
    TotalSy,
    TotalPt,
    LpSupply,
    LpBalance(Address),
    LpAllowance(AllowanceKey),
    Paused,
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketConfig {
    pub admin: Address,
    pub splitter: Address,
    pub sy_token: Address,
    pub maturity: u64,
    pub created_at: u64,
    pub period_size: u64,
    pub scalar_root: i128,
    pub fee_rate_root: i128,
    pub anchor_init: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketState {
    pub total_sy: i128,
    pub total_pt: i128,
    pub lp_supply: i128,
    pub anchor: i128,
    pub last_implied_rate: i128,
    pub maturity: u64,
    pub created_at: u64,
}
