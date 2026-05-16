#![no_std]

mod types;

use soroban_sdk::{contract, contractimpl, Env, String};

pub use types::SplitterConfig;

#[contract]
pub struct SplitterContract;

#[contractimpl]
impl SplitterContract {
    pub fn version(env: Env) -> String {
        String::from_str(&env, "0.1.0")
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test;
