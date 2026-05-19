#![no_std]

mod types;

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, panic_with_error, symbol_short, token,
    Address, Env,
};
use yield_math::constants::WAD;
use yield_math::wad::{mul_div, wad_div};
use yield_math::yield_calc::fixed_apy_from_pt_price;

pub use types::{BoostResult, DataKey};

pub const TTL_LOW: u32 = 17_280;
pub const TTL_BUMP: u32 = 535_680;

const SECONDS_PER_DAY: u64 = 86_400;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    AssetMismatch = 4,
    BoostRateBelowMinimum = 5,
}

#[contractclient(name = "SyClient")]
pub trait SyTokenInterface {
    fn deposit(env: Env, from: Address, amount: i128) -> i128;
    fn redeem(env: Env, from: Address, sy_amount: i128) -> i128;
    fn underlying(env: Env) -> Address;
    fn balance(env: Env, address: Address) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn exchange_rate(env: Env) -> i128;
}

#[contractclient(name = "SplitterClient")]
pub trait SplitterInterface {
    fn mint(env: Env, caller: Address, sy_amount: i128) -> (i128, i128);
    fn redeem_at_maturity(env: Env, caller: Address, pt_amount: i128) -> i128;
    fn pt_transfer(env: Env, from: Address, to: Address, amount: i128);
    fn yt_approve(env: Env, from: Address, spender: Address, amount: i128);
    fn sy_token(env: Env) -> Address;
}

#[contractclient(name = "MarketClient")]
pub trait MarketInterface {
    fn swap_exact_yt_for_sy(env: Env, caller: Address, yt_in: i128, min_sy_out: i128) -> i128;
    fn swap_exact_pt_for_sy(env: Env, caller: Address, pt_in: i128, min_sy_out: i128) -> i128;
    fn sy_token(env: Env) -> Address;
    fn splitter_address(env: Env) -> Address;
    fn maturity(env: Env) -> u64;
}

#[contract]
pub struct Router;

#[contractimpl]
impl Router {
    pub fn initialize(env: Env, admin: Address) {
        let store = env.storage().instance();
        if store.has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();
        store.set(&DataKey::Admin, &admin);
        store.extend_ttl(TTL_LOW, TTL_BUMP);
    }

    // ═══════════════════════════════════════════════
    // AUTO-EARN: every dollar starts earning on arrival
    // ═══════════════════════════════════════════════

    /// Pull `amount` of `asset` from the user, deposit it into Blend via the
    /// SY adapter, and hand the resulting SY tokens back to the user. The
    /// user's smart wallet now holds yield-bearing SY instead of idle
    /// underlying.
    pub fn auto_deposit(
        env: Env,
        user: Address,
        asset: Address,
        amount: i128,
        sy_adapter: Address,
    ) -> i128 {
        user.require_auth();
        ensure_positive(&env, amount);

        let sy = SyClient::new(&env, &sy_adapter);
        ensure_underlying_match(&env, &sy, &asset);
        let router = env.current_contract_address();

        token::Client::new(&env, &asset).transfer(&user, &router, &amount);
        let sy_minted = sy.deposit(&router, &amount);
        sy.transfer(&router, &user, &sy_minted);

        env.events().publish(
            (symbol_short!("auto_dep"), user.clone()),
            (asset, amount, sy_minted),
        );
        sy_minted
    }

    /// Withdraw `underlying_amount` worth of `asset` out of Blend. The
    /// router computes the SY needed from the live exchange rate, redeems,
    /// and forwards the underlying back to the user. This is the lever
    /// the Send flow pulls right before transferring to a counterparty.
    pub fn auto_withdraw(
        env: Env,
        user: Address,
        asset: Address,
        underlying_amount: i128,
        sy_adapter: Address,
    ) -> i128 {
        user.require_auth();
        ensure_positive(&env, underlying_amount);

        let sy = SyClient::new(&env, &sy_adapter);
        ensure_underlying_match(&env, &sy, &asset);
        let router = env.current_contract_address();

        // SY needed = underlying_amount * WAD / exchange_rate. Decimals
        // cancel because both underlying_amount and the result live in
        // the same 7-decimal underlying units.
        let rate = sy.exchange_rate();
        if rate <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let sy_needed = mul_div(underlying_amount, WAD, rate);
        ensure_positive(&env, sy_needed);

        sy.transfer(&user, &router, &sy_needed);
        let returned = sy.redeem(&router, &sy_needed);
        token::Client::new(&env, &asset).transfer(&router, &user, &returned);

        env.events().publish(
            (symbol_short!("auto_wd"), user.clone()),
            (asset, returned, sy_needed),
        );
        returned
    }

    // ═══════════════════════════════════════════════
    // BOOST: optional fixed-rate upgrade on top of auto-earn
    // ═══════════════════════════════════════════════

    /// Convert a portion of the user's auto-earning SY into a fixed-rate PT
    /// position. The user keeps the "upfront yield" portion as SY (still
    /// auto-earning) and holds PT which redeems for full underlying value
    /// at maturity.
    ///
    /// `min_boost_rate_wad` is the slippage floor on the locked-in rate.
    pub fn boost(
        env: Env,
        user: Address,
        sy_amount: i128,
        market: Address,
        min_boost_rate_wad: i128,
    ) -> BoostResult {
        user.require_auth();
        ensure_positive(&env, sy_amount);

        let market_client = MarketClient::new(&env, &market);
        let sy_addr = market_client.sy_token();
        let splitter_addr = market_client.splitter_address();
        let maturity = market_client.maturity();

        let sy = SyClient::new(&env, &sy_addr);
        let splitter = SplitterClient::new(&env, &splitter_addr);
        let router = env.current_contract_address();

        // 1. Pull SY from user → router.
        sy.transfer(&user, &router, &sy_amount);

        // 2. Split SY → equal PT + YT.
        let (pt_amount, yt_amount) = splitter.mint(&router, &sy_amount);

        // 3. Sell YT for SY (the upfront yield).
        splitter.yt_approve(&router, &market, &yt_amount);
        let upfront_yield_sy = market_client.swap_exact_yt_for_sy(&router, &yt_amount, &0i128);

        // 4. Hand PT to user (locked principal) and SY back (auto-earning).
        splitter.pt_transfer(&router, &user, &pt_amount);
        sy.transfer(&router, &user, &upfront_yield_sy);

        // 5. Compute the effective locked-in APY. PT price = (SY in - SY back) / SY in.
        let pt_price_wad = wad_div(sy_amount - upfront_yield_sy, sy_amount);
        let now = env.ledger().timestamp();
        let days_to_expiry = if maturity > now {
            (maturity - now) / SECONDS_PER_DAY
        } else {
            1
        };
        let days_to_expiry = if days_to_expiry == 0 { 1 } else { days_to_expiry };
        let boost_rate_wad = fixed_apy_from_pt_price(pt_price_wad, days_to_expiry);

        if boost_rate_wad < min_boost_rate_wad {
            panic_with_error!(&env, Error::BoostRateBelowMinimum);
        }

        env.events().publish(
            (symbol_short!("boost"), user.clone()),
            (sy_amount, pt_amount, upfront_yield_sy, boost_rate_wad, maturity),
        );

        BoostResult {
            pt_amount,
            upfront_yield_sy,
            boost_rate_wad,
            maturity,
        }
    }

    /// Exit a boost early by selling PT on the AMM at the prevailing market
    /// rate. The recovered SY flows back to the user — still auto-earning.
    /// May realise a loss vs. the originally-locked boost rate if market
    /// conditions moved against the user.
    pub fn unboost(env: Env, user: Address, market: Address, pt_amount: i128) -> i128 {
        user.require_auth();
        ensure_positive(&env, pt_amount);

        let market_client = MarketClient::new(&env, &market);
        let sy_addr = market_client.sy_token();
        let splitter_addr = market_client.splitter_address();
        let sy = SyClient::new(&env, &sy_addr);
        let splitter = SplitterClient::new(&env, &splitter_addr);
        let router = env.current_contract_address();

        splitter.pt_transfer(&user, &router, &pt_amount);
        // Selling PT into the pool requires the market to be able to pull
        // PT from the router; the splitter's pt_transfer_from handles this
        // inside swap_exact_pt_for_sy via the market's own balance ledger.
        let sy_received = market_client.swap_exact_pt_for_sy(&router, &pt_amount, &0i128);
        sy.transfer(&router, &user, &sy_received);

        env.events().publish(
            (symbol_short!("unboost"), user.clone()),
            (pt_amount, sy_received),
        );
        sy_received
    }

    /// After maturity, redeem PT for SY. The SY lands back in the user's
    /// auto-earn balance — no dead period, no manual re-deposit.
    pub fn redeem_boost(env: Env, user: Address, market: Address, pt_amount: i128) -> i128 {
        user.require_auth();
        ensure_positive(&env, pt_amount);

        let market_client = MarketClient::new(&env, &market);
        let sy_addr = market_client.sy_token();
        let splitter_addr = market_client.splitter_address();
        let sy = SyClient::new(&env, &sy_addr);
        let splitter = SplitterClient::new(&env, &splitter_addr);
        let router = env.current_contract_address();

        splitter.pt_transfer(&user, &router, &pt_amount);
        let sy_returned = splitter.redeem_at_maturity(&router, &pt_amount);
        sy.transfer(&router, &user, &sy_returned);

        env.events().publish(
            (symbol_short!("redeem_b"), user.clone()),
            (pt_amount, sy_returned),
        );
        sy_returned
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }
}

fn ensure_positive(env: &Env, amount: i128) {
    if amount <= 0 {
        panic_with_error!(env, Error::InvalidAmount);
    }
}

fn ensure_underlying_match(env: &Env, sy: &SyClient, expected: &Address) {
    let actual = sy.underlying();
    if &actual != expected {
        panic_with_error!(env, Error::AssetMismatch);
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test;
