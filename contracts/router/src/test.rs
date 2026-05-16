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

    // Seed liquidity in the market so the AMM can trade.
    sy.deposit(&lp, &10_000_000_000i128);     // 1000 USDC worth → SY
    splitter.mint(&lp, &2_000_000_000i128);   // 200 PT + 200 YT for LP
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
fn deposit_for_fixed_rate_returns_pt_and_upfront_yield() {
    let w = setup();

    let amount = 500_000_000i128; // 50 USDC
    let underlying_before = w.underlying.balance(&w.user);

    let result = w
        .router
        .deposit_for_fixed_rate(&w.user, &w.market_id, &amount, &0i128);

    // User received PT and some upfront yield in underlying.
    assert!(result.pt_minted > 0);
    assert!(result.yield_underlying > 0);
    assert_eq!(w.splitter.pt_balance(&w.user), result.pt_minted);
    let underlying_after = w.underlying.balance(&w.user);
    assert_eq!(
        underlying_after,
        underlying_before - amount + result.yield_underlying
    );
    // Yield should be a small fraction of the deposit (well below 20%).
    assert!(result.yield_underlying < amount / 5);
    assert_eq!(result.maturity, START_TS + NINETY_DAYS);
}

#[test]
fn redeem_at_maturity_returns_principal_to_user() {
    let w = setup();
    let amount = 500_000_000i128;
    let result = w
        .router
        .deposit_for_fixed_rate(&w.user, &w.market_id, &amount, &0i128);

    // Fast-forward past maturity.
    advance_time(&w.env, NINETY_DAYS + 1);
    w.splitter.sync();

    let underlying_before = w.underlying.balance(&w.user);
    let pt_before = w.splitter.pt_balance(&w.user);

    let returned = w
        .router
        .redeem_at_maturity(&w.user, &w.market_id, &pt_before);

    assert!(returned > 0);
    let underlying_after = w.underlying.balance(&w.user);
    assert_eq!(underlying_after - underlying_before, returned);
    assert_eq!(w.splitter.pt_balance(&w.user), 0);
    // PT principal + upfront yield should cover the original deposit. In this
    // test the SY pool never accrued any yield, so LPs absorb the locked-in
    // rate as a loss; the user is paid out >= what they put in.
    let total_received = returned + result.yield_underlying;
    assert!(
        total_received >= amount,
        "user got {} for {} deposit",
        total_received,
        amount
    );
}

#[test]
fn deposit_for_flex_round_trips_through_sy() {
    let w = setup();
    let amount = 100_000_000i128;
    let underlying_before = w.underlying.balance(&w.user);
    let sy_before = w.sy.balance(&w.user);

    let sy_minted = w
        .router
        .deposit_for_flex(&w.user, &w.sy_id, &amount);

    assert!(sy_minted > 0);
    assert_eq!(w.sy.balance(&w.user), sy_before + sy_minted);
    assert_eq!(w.underlying.balance(&w.user), underlying_before - amount);
}

#[test]
fn withdraw_flex_redeems_sy_back_to_underlying() {
    let w = setup();
    let amount = 100_000_000i128;
    let sy_minted = w
        .router
        .deposit_for_flex(&w.user, &w.sy_id, &amount);

    let underlying_before = w.underlying.balance(&w.user);
    let returned = w
        .router
        .withdraw_flex(&w.user, &w.sy_id, &sy_minted);

    assert!(returned > 0);
    assert_eq!(returned, amount, "no yield ⇒ round-trip is identity");
    assert_eq!(w.underlying.balance(&w.user), underlying_before + returned);
    assert_eq!(w.sy.balance(&w.user), 0);
}

#[test]
fn withdraw_flex_after_yield_returns_more_underlying() {
    let w = setup();
    let amount = 100_000_000i128;
    let sy_minted = w
        .router
        .deposit_for_flex(&w.user, &w.sy_id, &amount);

    // Inject 10% yield into the SY pool.
    let pool_balance = w.underlying.balance(&w.sy_id);
    w.underlying_admin.mint(&w.sy_id, &(pool_balance / 10));

    let returned = w
        .router
        .withdraw_flex(&w.user, &w.sy_id, &sy_minted);
    assert!(returned > amount, "should get yield, got {} vs {}", returned, amount);
    let _ = w.admin;
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn deposit_for_flex_rejects_zero_amount() {
    let w = setup();
    w.router.deposit_for_flex(&w.user, &w.sy_id, &0i128);
}
