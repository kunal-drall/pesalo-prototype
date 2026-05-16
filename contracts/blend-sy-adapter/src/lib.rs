#![no_std]

mod types;

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, token, Address, Env,
    String,
};
use yield_math::constants::WAD;
use yield_math::wad::mul_div;

pub use types::{AdapterConfig, AllowanceKey, DataKey};

/// Storage TTL bounds (~1 day low watermark, ~30 day extend target).
pub const TTL_LOW: u32 = 17_280;
pub const TTL_BUMP: u32 = 535_680;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    InvalidAmount = 4,
    InsufficientBalance = 5,
    InsufficientAllowance = 6,
    Paused = 7,
    NoSupply = 8,
}

#[contract]
pub struct BlendSyAdapter;

#[contractimpl]
impl BlendSyAdapter {
    /// Initialize the SY adapter. Pairs an underlying token with this contract's
    /// SY balance ledger. Idempotent — repeated calls revert.
    pub fn initialize(
        env: Env,
        admin: Address,
        underlying: Address,
        decimals: u32,
        name: String,
        symbol: String,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();

        let store = env.storage().instance();
        store.set(&DataKey::Admin, &admin);
        store.set(&DataKey::Underlying, &underlying);
        store.set(&DataKey::Decimals, &decimals);
        store.set(&DataKey::Name, &name);
        store.set(&DataKey::Symbol, &symbol);
        store.set(&DataKey::TotalSupply, &0i128);
        store.set(&DataKey::Paused, &false);
        store.extend_ttl(TTL_LOW, TTL_BUMP);
    }

    /// Grant mint/burn rights to a contract (e.g. Splitter). Admin-only.
    pub fn set_minter(env: Env, minter: Address, enabled: bool) {
        let admin = read_admin(&env);
        admin.require_auth();

        let key = DataKey::Minter(minter);
        if enabled {
            env.storage().instance().set(&key, &true);
        } else {
            env.storage().instance().remove(&key);
        }
        env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
    }

    /// Pause or unpause deposits and redemptions. Transfers remain enabled.
    pub fn set_paused(env: Env, paused: bool) {
        let admin = read_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &paused);
        env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
    }

    /// Deposit underlying tokens, receive SY at the current exchange rate.
    /// Returns the SY amount minted.
    pub fn deposit(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();
        ensure_active(&env);
        ensure_positive(&env, amount);

        let underlying = read_underlying(&env);
        let token = token::Client::new(&env, &underlying);
        token.transfer(&from, &env.current_contract_address(), &amount);

        let supply = read_supply(&env);
        let pool_after = token.balance(&env.current_contract_address());
        let pool_before = pool_after - amount;

        let sy_minted = if supply == 0 || pool_before <= 0 {
            amount
        } else {
            mul_div(amount, supply, pool_before)
        };
        ensure_positive(&env, sy_minted);

        mint_internal(&env, &from, sy_minted);

        env.events().publish(
            (symbol_short!("deposit"), from.clone()),
            (amount, sy_minted),
        );
        sy_minted
    }

    /// Burn SY and receive proportional underlying.
    /// Returns the underlying amount returned.
    pub fn redeem(env: Env, from: Address, sy_amount: i128) -> i128 {
        from.require_auth();
        ensure_active(&env);
        ensure_positive(&env, sy_amount);

        let supply = read_supply(&env);
        if supply <= 0 {
            panic_with_error!(&env, Error::NoSupply);
        }

        let underlying = read_underlying(&env);
        let token = token::Client::new(&env, &underlying);
        let pool = token.balance(&env.current_contract_address());
        let amount = mul_div(sy_amount, pool, supply);
        ensure_positive(&env, amount);

        burn_internal(&env, &from, sy_amount);
        token.transfer(&env.current_contract_address(), &from, &amount);

        env.events().publish(
            (symbol_short!("redeem"), from.clone()),
            (sy_amount, amount),
        );
        amount
    }

    /// Current exchange rate (WAD): how much underlying one SY is worth.
    /// Returns WAD (1.0) when supply is zero.
    pub fn exchange_rate(env: Env) -> i128 {
        let supply = read_supply(&env);
        if supply == 0 {
            return WAD;
        }
        let underlying = read_underlying(&env);
        let token = token::Client::new(&env, &underlying);
        let pool = token.balance(&env.current_contract_address());
        mul_div(pool, WAD, supply)
    }

    /// SY balance of an address.
    pub fn balance(env: Env, address: Address) -> i128 {
        read_balance(&env, &address)
    }

    /// Total SY in circulation.
    pub fn total_supply(env: Env) -> i128 {
        read_supply(&env)
    }

    /// Transfer SY between two accounts. Requires authorization from `from`.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        ensure_positive(&env, amount);
        transfer_internal(&env, &from, &to, amount);
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    /// Transfer SY using a previously-approved allowance.
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        ensure_positive(&env, amount);
        spend_allowance(&env, &from, &spender, amount);
        transfer_internal(&env, &from, &to, amount);
        env.events()
            .publish((symbol_short!("xfer_from"), from, to), amount);
    }

    /// Approve `spender` to move up to `amount` SY from caller's balance.
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        if amount < 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().set(&key, &amount);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
        env.events()
            .publish((symbol_short!("approve"), from, spender), amount);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(AllowanceKey { from, spender });
        env.storage()
            .persistent()
            .get::<DataKey, i128>(&key)
            .unwrap_or(0)
    }

    /// Mint SY directly to an account. Restricted to authorized minters.
    pub fn mint(env: Env, caller: Address, to: Address, amount: i128) {
        caller.require_auth();
        ensure_minter(&env, &caller);
        ensure_positive(&env, amount);
        mint_internal(&env, &to, amount);
        env.events()
            .publish((symbol_short!("mint"), caller, to), amount);
    }

    /// Burn SY from an account. Restricted to authorized minters.
    pub fn burn(env: Env, caller: Address, from: Address, amount: i128) {
        caller.require_auth();
        ensure_minter(&env, &caller);
        ensure_positive(&env, amount);
        burn_internal(&env, &from, amount);
        env.events()
            .publish((symbol_short!("burn"), caller, from), amount);
    }

    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap_or(7)
    }

    pub fn underlying(env: Env) -> Address {
        read_underlying(&env)
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_underlying(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Underlying)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_supply(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0)
}

fn write_supply(env: &Env, value: i128) {
    env.storage().instance().set(&DataKey::TotalSupply, &value);
    env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
}

fn read_balance(env: &Env, address: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(address.clone()))
        .unwrap_or(0)
}

fn write_balance(env: &Env, address: &Address, value: i128) {
    let key = DataKey::Balance(address.clone());
    if value == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &value);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
    }
}

fn mint_internal(env: &Env, to: &Address, amount: i128) {
    let supply = read_supply(env);
    let balance = read_balance(env, to);
    write_supply(env, supply + amount);
    write_balance(env, to, balance + amount);
}

fn burn_internal(env: &Env, from: &Address, amount: i128) {
    let balance = read_balance(env, from);
    if balance < amount {
        panic_with_error!(env, Error::InsufficientBalance);
    }
    let supply = read_supply(env);
    write_balance(env, from, balance - amount);
    write_supply(env, supply - amount);
}

fn transfer_internal(env: &Env, from: &Address, to: &Address, amount: i128) {
    let from_balance = read_balance(env, from);
    if from_balance < amount {
        panic_with_error!(env, Error::InsufficientBalance);
    }
    let to_balance = read_balance(env, to);
    write_balance(env, from, from_balance - amount);
    write_balance(env, to, to_balance + amount);
}

fn spend_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
    let key = DataKey::Allowance(AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    });
    let current = env
        .storage()
        .persistent()
        .get::<DataKey, i128>(&key)
        .unwrap_or(0);
    if current < amount {
        panic_with_error!(env, Error::InsufficientAllowance);
    }
    let remaining = current - amount;
    if remaining == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &remaining);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
    }
}

fn ensure_minter(env: &Env, caller: &Address) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized));
    if &admin == caller {
        return;
    }
    let allowed = env
        .storage()
        .instance()
        .get::<DataKey, bool>(&DataKey::Minter(caller.clone()))
        .unwrap_or(false);
    if !allowed {
        panic_with_error!(env, Error::NotAuthorized);
    }
}

fn ensure_active(env: &Env) {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false);
    if paused {
        panic_with_error!(env, Error::Paused);
    }
}

fn ensure_positive(env: &Env, amount: i128) {
    if amount <= 0 {
        panic_with_error!(env, Error::InvalidAmount);
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test;
