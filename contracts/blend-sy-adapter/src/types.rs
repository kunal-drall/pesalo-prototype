use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdapterConfig {
    pub admin: Address,
    pub blend_pool: Address,
    pub underlying: Address,
    pub sy_token: Address,
    pub is_native_xlm: bool,
}
