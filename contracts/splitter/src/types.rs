use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitterConfig {
    pub admin: Address,
    pub sy_adapter: Address,
    pub maturity: u64,
    pub pt_token: Address,
    pub yt_token: Address,
}
