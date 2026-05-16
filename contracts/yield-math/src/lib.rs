#![no_std]

pub mod constants;

pub const VERSION: &str = "0.1.0";

pub fn version() -> &'static str {
    VERSION
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod tests;
