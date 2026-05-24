#![cfg(test)]

use super::*;
use blend_sy_adapter::{BlendSyAdapter, BlendSyAdapterClient};
use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{token, Address, Env, String};
use splitter::{Splitter, SplitterClient as RealSplitterClient};
use yield_math::constants::WAD;

const SECONDS_PER_DAY: u64 = 86_400;
const NINETY_DAYS: u64 = 90 * SECONDS_PER_DAY;
const START_TS: u64 = 1_715_000_000;

struct World<'a> {
    env: Env,
    admin: Address,
    lp: Address,
    trader: Address,
    underlying_id: Address,
    underlying_client: token::StellarAssetClient<'a>,
    sy_id: Address,
    sy: BlendSyAdapterClient<'a>,
    splitter_id: Address,
    splitter: RealSplitterClient<'a>,
    market_id: Address,
    market: YieldMarketClient<'a>,
}

fn setup<'a>() -> World<'a> {
    let env = Env::default();
    env.mock_all_auths();
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
    let lp = Address::generate(&env);
    let trader = Address::generate(&env);
    let underlying_admin = Address::generate(&env);

    let underlying_id = env
        .register_stellar_asset_contract_v2(underlying_admin)
        .address();
    let underlying_client = token::StellarAssetClient::new(&env, &underlying_id);

    let sy_id = env.register_contract(None, BlendSyAdapter);
    let sy = BlendSyAdapterClient::new(&env, &sy_id);
    sy.initialize(
        &admin,
        &underlying_id,
        &7u32,
        &String::from_str(&env, "Pesalo SY-bUSDC"),
        &String::from_str(&env, "SYbUSDC"),
    );

    underlying_client.mint(&lp, &100_000_000_000_000i128);
    underlying_client.mint(&trader, &100_000_000_000_000i128);

    // Give LP and trader plenty of SY.
    sy.deposit(&lp, &10_000_000_000i128);     // 1000 USDC worth
    sy.deposit(&trader, &10_000_000_000i128); // 1000 USDC worth

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

    // scalar_root=80*WAD, anchor_init=1.025*WAD, fee=WAD/1000 (10 bps).
    let scalar_root = 80i128 * WAD;
    let fee_rate_root = WAD / 1_000;
    let anchor_init = 1_025_000_000_000_000_000i128;

    market.initialize(
        &admin,
        &sy_id,
        &splitter_id,
        &maturity,
        &scalar_root,
        &fee_rate_root,
        &anchor_init,
    );

    // Authorize the market as a splitter minter (needed for flash swaps).
    splitter.set_minter(&market_id, &true);

    World {
        env,
        admin,
        lp,
        trader,
        underlying_id,
        underlying_client,
        sy_id,
        sy,
        splitter_id,
        splitter,
        market_id,
        market,
    }
}

fn advance_time(env: &Env, seconds: u64) {
    let mut info = env.ledger().get();
    info.timestamp += seconds;
    env.ledger().set(info);
}

fn seed_liquidity(w: &World) {
    // LP mints SY → PT+YT, deposits 50/50 PT+SY into the pool.
    w.splitter.mint(&w.lp, &2_000_000_000i128);
    // After mint, LP has 2e9 PT, 2e9 YT, and (10e9 - 2e9) = 8e9 SY.
    // Deposit 1e9 SY + 1e9 PT into the pool (50/50 by asset units).
    w.market.add_liquidity(&w.lp, &1_000_000_000i128, &1_000_000_000i128);
}

#[test]
fn initialize_stores_config() {
    let w = setup();
    assert_eq!(w.market.admin(), w.admin);
    assert_eq!(w.market.sy_token(), w.sy_id);
    assert_eq!(w.market.splitter_address(), w.splitter_id);
    assert_eq!(w.market.maturity(), START_TS + NINETY_DAYS);
    assert_eq!(w.market.lp_supply(), 0);
    let _ = (w.trader, w.underlying_id, w.underlying_client, w.sy);
}

#[test]
fn add_liquidity_bootstrap_mints_lp_tokens() {
    let w = setup();
    seed_liquidity(&w);
    let lp_bal = w.market.lp_balance(&w.lp);
    assert!(lp_bal > 0, "lp should have positive LP balance");
    let s = w.market.state();
    assert_eq!(s.total_sy, 1_000_000_000i128);
    assert_eq!(s.total_pt, 1_000_000_000i128);
    assert!(s.lp_supply > 0);
}

#[test]
fn implied_rate_is_positive_after_bootstrap() {
    let w = setup();
    seed_liquidity(&w);
    let rate = w.market.implied_rate();
    // 50/50 pool with anchor 1.025 should give implied rate near 10% (annualized).
    // The annualization is roughly (1.025 - 1) * 365/90 ≈ 0.1014 → 10.14%.
    assert!(rate > 0, "implied rate must be positive");
    assert!(rate < WAD / 2, "implied rate sanity (<50%)");
}

#[test]
fn swap_sy_for_exact_pt_returns_pt_and_decreases_proportion() {
    let w = setup();
    seed_liquidity(&w);

    // Trader mints SY-only deposit: 1e9 SY.
    let pt_out = 100_000_000i128; // buy 10 USDC worth of PT
    let sy_before = w.sy.balance(&w.trader);
    let pt_before = w.splitter.pt_balance(&w.trader);

    let sy_paid = w.market.swap_sy_for_exact_pt(
        &w.trader,
        &pt_out,
        &200_000_000i128, // max sy in
    );

    assert!(sy_paid > 0 && sy_paid < pt_out, "PT trades at discount");
    assert_eq!(w.sy.balance(&w.trader), sy_before - sy_paid);
    assert_eq!(w.splitter.pt_balance(&w.trader), pt_before + pt_out);

    let s = w.market.state();
    // total_pt decreased, total_sy increased
    assert_eq!(s.total_pt, 1_000_000_000 - pt_out);
    assert_eq!(s.total_sy, 1_000_000_000 + sy_paid);
}

#[test]
fn swap_exact_pt_for_sy_returns_sy() {
    let w = setup();
    seed_liquidity(&w);

    // Trader mints PT+YT first, then sells PT to pool.
    w.splitter.mint(&w.trader, &500_000_000i128);

    let pt_in = 100_000_000i128;
    let sy_before = w.sy.balance(&w.trader);
    let sy_out = w.market.swap_exact_pt_for_sy(&w.trader, &pt_in, &0i128);

    assert!(sy_out > 0);
    assert!(sy_out < pt_in, "selling PT yields fewer SY than PT (discount)");
    assert_eq!(w.sy.balance(&w.trader), sy_before + sy_out);
}

#[test]
fn swap_yt_for_sy_produces_upfront_yield() {
    let w = setup();
    seed_liquidity(&w);

    // Trader mints SY → PT+YT.
    let (pt_minted, yt_minted) = w.splitter.mint(&w.trader, &500_000_000i128);
    assert_eq!(pt_minted, yt_minted);

    // Approve the market to pull YT.
    w.splitter.yt_approve(&w.trader, &w.market_id, &yt_minted);

    let sy_before = w.sy.balance(&w.trader);
    let sy_out = w
        .market
        .swap_exact_yt_for_sy(&w.trader, &yt_minted, &0i128);

    assert!(sy_out > 0, "selling YT should produce upfront SY");
    // Upfront yield should be small relative to PT (~3-5% of the YT amount for 90-day fixed rate).
    assert!(sy_out < yt_minted / 5, "yield is a fraction of YT amount");
    assert_eq!(w.sy.balance(&w.trader), sy_before + sy_out);

    // Trader still holds the PT (the Fixed Savings principal).
    assert_eq!(w.splitter.pt_balance(&w.trader), pt_minted);
    // YT supply was consumed (burned by the market).
    assert_eq!(w.splitter.yt_balance(&w.trader), 0);
}

#[test]
fn implied_rate_changes_after_a_trade() {
    let w = setup();
    seed_liquidity(&w);
    let r_before = w.market.implied_rate();
    w.market.swap_sy_for_exact_pt(
        &w.trader,
        &200_000_000i128,
        &500_000_000i128,
    );
    let r_after = w.market.implied_rate();
    // Buying PT pushes its price up → implied rate (yield) drops.
    assert!(r_after < r_before, "rate should fall after PT buy");
}

#[test]
fn remove_liquidity_returns_proportional_sy_and_pt() {
    let w = setup();
    seed_liquidity(&w);
    let lp_balance = w.market.lp_balance(&w.lp);
    let half = lp_balance / 2;

    let sy_before = w.sy.balance(&w.lp);
    let pt_before = w.splitter.pt_balance(&w.lp);
    let (sy_out, pt_out) = w.market.remove_liquidity(&w.lp, &half);

    assert!(sy_out > 0 && pt_out > 0);
    assert_eq!(w.sy.balance(&w.lp), sy_before + sy_out);
    assert_eq!(w.splitter.pt_balance(&w.lp), pt_before + pt_out);
    assert_eq!(w.market.lp_balance(&w.lp), lp_balance - half);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn paused_market_rejects_swaps() {
    let w = setup();
    seed_liquidity(&w);
    w.market.set_paused(&true);
    w.market.swap_sy_for_exact_pt(&w.trader, &100_000i128, &10_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn matured_market_rejects_swaps() {
    let w = setup();
    seed_liquidity(&w);
    advance_time(&w.env, NINETY_DAYS + 1);
    w.market.swap_sy_for_exact_pt(&w.trader, &100_000i128, &10_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn slippage_exceeded_panics() {
    let w = setup();
    seed_liquidity(&w);
    // Buy PT but cap SY in at zero — must fail.
    w.market
        .swap_sy_for_exact_pt(&w.trader, &100_000_000i128, &1i128);
}
