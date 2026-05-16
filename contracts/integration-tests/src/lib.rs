#![no_std]

use soroban_sdk::{contract, contractimpl, Env, String};

#[contract]
pub struct IntegrationHarnessContract;

#[contractimpl]
impl IntegrationHarnessContract {
    pub fn version(env: Env) -> String {
        String::from_str(&env, "0.1.0")
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test_full_fixed;

#[cfg(test)]
mod test_full_flex;

#[cfg(test)]
mod test_multi_asset;
