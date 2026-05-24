use soroban_sdk::{contracttype, Address, String};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    SyToken,
    Maturity,
    Decimals,
    PtName,
    PtSymbol,
    YtName,
    YtSymbol,
    Paused,
    Minter(Address),
    TotalSupply,
    PyIndex,
    PyIndexAtMaturity,
    YieldIndex,
    PtBalance(Address),
    YtBalance(Address),
    PtAllowance(AllowanceKey),
    YtAllowance(AllowanceKey),
    UserYieldIndex(Address),
    UserUnclaimedSy(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitterConfig {
    pub admin: Address,
    pub sy_token: Address,
    pub maturity: u64,
    pub decimals: u32,
    pub pt_name: String,
    pub pt_symbol: String,
    pub yt_name: String,
    pub yt_symbol: String,
}
