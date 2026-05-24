#![cfg(test)]

use super::*;
use blend_sy_adapter::{BlendSyAdapter, BlendSyAdapterClient};
use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{token, Address, Env, String};
use splitter::{Splitter, SplitterClient as RealSplitterClient};
use yield_market::{YieldMarket, YieldMarketClient};
use yield_math::constants::WAD;

const SECONDS_PER_DAY: u64 = 86_400;
const NINETY_DAYS: u64 = 90 * SECONDS_PER_DAY;
const START_TS: u64 = 1_715_000_000;

struct World<'a> {
    env: Env,
    admin: Address,
    user: Address,
    lp: Address,
    underlying_id: Address,
    underlying_admin: token::StellarAssetClient<'a>,
    underlying: token::TokenClient<'a>,
    sy_id: Address,
    sy: BlendSyAdapterClient<'a>,
    splitter_id: Address,
    splitter: RealSplitterClient<'a>,
    market_id: Address,
    market: YieldMarketClient<'a>,
    router_id: Address,
    router: RouterClient<'a>,
}

fn setup<'a>() -> World<'a> {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();
    env.ledger().set(LedgerInfo {
        timestamp: START_TS,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 16,
        min_persistent_entry_ttl: 4096,
        max_entry_ttl: 6_312_000,
    });

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let lp = Address::generate(&env);
    let underlying_admin_addr = Address::generate(&env);

    let underlying_id = env
        .register_stellar_asset_contract_v2(underlying_admin_addr)
        .address();
    let underlying_admin = token::StellarAssetClient::new(&env, &underlying_id);
    let underlying = token::TokenClient::new(&env, &underlying_id);

    let sy_id = env.register_contract(None, BlendSyAdapter);
    let sy = BlendSyAdapterClient::new(&env, &sy_id);
    sy.initialize(
        &admin,
        &underlying_id,
        &7u32,
        &String::from_str(&env, "Pesalo SY-bUSDC"),
        &String::from_str(&env, "SYbUSDC"),
    );

    underlying_admin.mint(&user, &100_000_000_000_000i128);
    underlying_admin.mint(&lp, &100_000_000_000_000i128);

    let maturity = START_TS + NINETY_DAYS;
    let splitter_id = env.register_contract(None, Splitter);
    let splitter = RealSplitterClient::new(&env, &splitter_id);
    splitter.initialize(
        &admin,
        &sy_id,
        &maturity,
        &7u32,
        &String::from_str(&env, "PT-bUSDC"),
        &String::from_str(&env, "PT-bUSDC"),
        &String::from_str(&env, "YT-bUSDC"),
        &String::from_str(&env, "YT-bUSDC"),
    );

    let market_id = env.register_contract(None, YieldMarket);
    let market = YieldMarketClient::new(&env, &market_id);
    market.initialize(
        &admin,
        &sy_id,
        &splitter_id,
        &maturity,
        &(80i128 * WAD),
        &(WAD / 1_000),
        &1_025_000_000_000_000_000i128,
    );

    splitter.set_minter(&market_id, &true);

    let router_id = env.register_contract(None, Router);
    let router = RouterClient::new(&env, &router_id);
    router.initialize(&admin);
    splitter.set_minter(&router_id, &true);

    // Seed liquidity so the boost path has somewhere to sell YT.
    sy.deposit(&lp, &10_000_000_000i128);
    splitter.mint(&lp, &2_000_000_000i128);
    market.add_liquidity(&lp, &1_000_000_000i128, &1_000_000_000i128);

    World {
        env,
        admin,
        user,
        lp,
        underlying_id,
        underlying_admin,
        underlying,
        sy_id,
        sy,
        splitter_id,
        splitter,
        market_id,
        market,
        router_id,
        router,
    }
}

fn advance_time(env: &Env, seconds: u64) {
    let mut info = env.ledger().get();
    info.timestamp += seconds;
    env.ledger().set(info);
}

#[test]
fn auto_deposit_moves_underlying_into_sy() {
    let w = setup();
    let amount = 500_000_000i128;
    let underlying_before = w.underlying.balance(&w.user);
    let sy_before = w.sy.balance(&w.user);

    let sy_minted = w
        .router
        .auto_deposit(&w.user, &w.underlying_id, &amount, &w.sy_id);

    assert!(sy_minted > 0);
    assert_eq!(w.sy.balance(&w.user), sy_before + sy_minted);
    assert_eq!(w.underlying.balance(&w.user), underlying_before - amount);
    // User now holds SY (yield-bearing), no idle underlying for this amount.
}

#[test]
fn auto_withdraw_pulls_underlying_back_through_sy() {
    let w = setup();
    let amount = 200_000_000i128;
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &amount, &w.sy_id);

    let underlying_before = w.underlying.balance(&w.user);
    let sy_before = w.sy.balance(&w.user);

    let returned = w
        .router
        .auto_withdraw(&w.user, &w.underlying_id, &amount, &w.sy_id);

    assert_eq!(returned, amount);
    assert_eq!(w.underlying.balance(&w.user), underlying_before + amount);
    assert!(w.sy.balance(&w.user) < sy_before);
}

#[test]
fn auto_withdraw_after_yield_returns_correct_underlying() {
    let w = setup();
    let amount = 1_000_000_000i128; // 100 underlying units
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &amount, &w.sy_id);

    // Simulate 10% yield by minting extra underlying directly to the SY adapter
    // (matches how the SY adapter models Blend interest accrual in passive mode).
    w.underlying_admin.mint(&w.sy_id, &(amount / 10));

    // Withdrawing the original principal back. The remaining SY position
    // should still reflect ~10% yield earned on top.
    let pre_underlying = w.underlying.balance(&w.user);
    let returned = w
        .router
        .auto_withdraw(&w.user, &w.underlying_id, &amount, &w.sy_id);

    // 1-stroop rounding tolerance — mul_div(amount, WAD, rate) truncates.
    assert!(
        returned >= amount - 1 && returned <= amount,
        "got {returned}, expected ~{amount}"
    );
    assert_eq!(w.underlying.balance(&w.user), pre_underlying + returned);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn auto_deposit_rejects_mismatched_asset() {
    let w = setup();
    let bogus = Address::generate(&w.env);
    w.router
        .auto_deposit(&w.user, &bogus, &100_000_000i128, &w.sy_id);
}

#[test]
fn boost_locks_pt_and_returns_upfront_yield_sy() {
    let w = setup();
    // Get the user into auto-earn first.
    let sy_balance = w
        .router
        .auto_deposit(&w.user, &w.underlying_id, &2_000_000_000i128, &w.sy_id);

    let boost_amount = 500_000_000i128; // boost a portion of the SY balance
    let result = w.router.boost(&w.user, &boost_amount, &w.market_id, &0i128);

    assert!(result.pt_amount > 0);
    assert!(result.upfront_yield_sy > 0);
    // Boost rate should be positive and within reasonable bounds (<100%).
    assert!(result.boost_rate_wad > 0 && result.boost_rate_wad < WAD);
    assert_eq!(result.maturity, START_TS + NINETY_DAYS);

    // User received PT (locked principal) directly.
    assert_eq!(w.splitter.pt_balance(&w.user), result.pt_amount);
    // User's SY balance reflects: (initial) - (boosted) + (upfront yield from YT sale).
    let final_sy = w.sy.balance(&w.user);
    let expected = sy_balance - boost_amount + result.upfront_yield_sy;
    assert_eq!(final_sy, expected);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn boost_panics_below_minimum_rate() {
    let w = setup();
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &2_000_000_000i128, &w.sy_id);
    // Demand an absurdly high boost rate (1000% WAD) — should fail.
    w.router
        .boost(&w.user, &500_000_000i128, &w.market_id, &(10 * WAD));
}

#[test]
fn unboost_returns_sy_back_to_user() {
    let w = setup();
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &2_000_000_000i128, &w.sy_id);
    let result = w
        .router
        .boost(&w.user, &500_000_000i128, &w.market_id, &0i128);

    let sy_before = w.sy.balance(&w.user);
    let sy_received = w.router.unboost(&w.user, &w.market_id, &result.pt_amount);

    assert!(sy_received > 0);
    assert_eq!(w.sy.balance(&w.user), sy_before + sy_received);
    assert_eq!(w.splitter.pt_balance(&w.user), 0);
}

#[test]
fn redeem_boost_returns_sy_at_maturity() {
    let w = setup();
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &2_000_000_000i128, &w.sy_id);
    let result = w
        .router
        .boost(&w.user, &500_000_000i128, &w.market_id, &0i128);

    advance_time(&w.env, NINETY_DAYS + 1);
    w.splitter.sync();

    let sy_before = w.sy.balance(&w.user);
    let sy_returned = w
        .router
        .redeem_boost(&w.user, &w.market_id, &result.pt_amount);

    assert!(sy_returned > 0);
    assert_eq!(w.sy.balance(&w.user), sy_before + sy_returned);
    // PT is fully redeemed.
    assert_eq!(w.splitter.pt_balance(&w.user), 0);
}

#[test]
fn full_lifecycle_auto_earn_boost_send() {
    let w = setup();

    // 1. Receive 200 USDC and auto-deposit.
    let deposit_amount = 2_000_000_000i128;
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &deposit_amount, &w.sy_id);

    // 2. Boost ~30% of pool depth (≈30 USDC worth of SY).
    let boost_amount = 300_000_000i128;
    let boost = w
        .router
        .boost(&w.user, &boost_amount, &w.market_id, &0i128);
    assert!(boost.pt_amount > 0);

    // 3. Send 50 USDC: auto_withdraw 50 underlying from remaining auto-earn SY.
    let send_amount = 500_000_000i128;
    let withdrawn = w
        .router
        .auto_withdraw(&w.user, &w.underlying_id, &send_amount, &w.sy_id);
    assert!(withdrawn >= send_amount - 1 && withdrawn <= send_amount);

    // 4. Advance to maturity and redeem the boost.
    advance_time(&w.env, NINETY_DAYS + 1);
    w.splitter.sync();
    let sy_back = w
        .router
        .redeem_boost(&w.user, &w.market_id, &boost.pt_amount);
    assert!(sy_back > 0);

    // Final state: user holds SY (still auto-earning) + the withdrawn underlying
    // they used for sending.
    assert!(w.sy.balance(&w.user) > 0);
    let _ = (w.admin, w.router_id, w.splitter_id, w.lp);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn auto_deposit_rejects_zero_amount() {
    let w = setup();
    w.router
        .auto_deposit(&w.user, &w.underlying_id, &0i128, &w.sy_id);
}
