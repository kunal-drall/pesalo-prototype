#![no_std]

pub mod amm;
pub mod constants;
pub mod logit;
pub mod transcendental;
pub mod wad;
pub mod yield_calc;

pub const VERSION: &str = "0.1.0";

pub fn version() -> &'static str {
    VERSION
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests;
