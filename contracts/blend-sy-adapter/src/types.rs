use soroban_sdk::{contracttype, Address, String};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Underlying,
    Decimals,
    Name,
    Symbol,
    TotalSupply,
    Balance(Address),
    Allowance(AllowanceKey),
    Minter(Address),
    Paused,
    /// Optional Blend Pool address. When set, deposits forward into the pool
    /// (Supply request) and redemptions pull from it (Withdraw request).
    BlendPool,
}

/// Mirrors Blend Capital V2's `Request` struct in
/// `blend-contracts/pool/src/dependencies/pool.rs`. The fields are stable across
/// V2 audits — see <https://docs.blend.capital>.
#[contracttype]
#[derive(Clone)]
pub struct BlendRequest {
    pub request_type: u32,
    pub address: Address,
    pub amount: i128,
}

/// Request type codes from Blend Capital V2.
pub const BLEND_REQ_SUPPLY: u32 = 0;
pub const BLEND_REQ_WITHDRAW: u32 = 1;

#[derive(Clone)]
#[contracttype]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdapterConfig {
    pub admin: Address,
    pub underlying: Address,
    pub decimals: u32,
    pub name: String,
    pub symbol: String,
}
