#![cfg(test)]

use super::*;
use blend_sy_adapter::{BlendSyAdapter, BlendSyAdapterClient};
use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{token, Address, Env, String};
use yield_math::constants::WAD;

const SECONDS_PER_DAY: u64 = 86_400;
const NINETY_DAYS: u64 = 90 * SECONDS_PER_DAY;
const START_TS: u64 = 1_715_000_000;

struct Fixture<'a> {
    env: Env,
    admin: Address,
    user_a: Address,
    user_b: Address,
    underlying_id: Address,
    underlying_client: token::StellarAssetClient<'a>,
    underlying_token: token::TokenClient<'a>,
    sy_id: Address,
    sy: BlendSyAdapterClient<'a>,
    splitter_id: Address,
    splitter: SplitterClient<'a>,
    maturity: u64,
}

fn setup<'a>() -> Fixture<'a> {
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
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let underlying_admin = Address::generate(&env);

    let underlying_id = env
        .register_stellar_asset_contract_v2(underlying_admin)
        .address();
    let underlying_client = token::StellarAssetClient::new(&env, &underlying_id);
    let underlying_token = token::TokenClient::new(&env, &underlying_id);

    let sy_id = env.register_contract(None, BlendSyAdapter);
    let sy = BlendSyAdapterClient::new(&env, &sy_id);
    sy.initialize(
        &admin,
        &underlying_id,
        &7u32,
        &String::from_str(&env, "Pesalo SY-bUSDC"),
        &String::from_str(&env, "SYbUSDC"),
    );

    underlying_client.mint(&user_a, &10_000_000_000_000i128);
    underlying_client.mint(&user_b, &10_000_000_000_000i128);

    sy.deposit(&user_a, &1_000_000_000i128);
    sy.deposit(&user_b, &1_000_000_000i128);

    let splitter_id = env.register_contract(None, Splitter);
    let splitter = SplitterClient::new(&env, &splitter_id);
    let maturity = START_TS + NINETY_DAYS;
    splitter.initialize(
        &admin,
        &sy_id,
        &maturity,
        &7u32,
        &String::from_str(&env, "PT bUSDC Sep26"),
        &String::from_str(&env, "PT-bUSDC"),
        &String::from_str(&env, "YT bUSDC Sep26"),
        &String::from_str(&env, "YT-bUSDC"),
    );

    Fixture {
        env,
        admin,
        user_a,
        user_b,
        underlying_id,
        underlying_client,
        underlying_token,
        sy_id,
        sy,
        splitter_id,
        splitter,
        maturity,
    }
}

fn advance_time(env: &Env, seconds: u64) {
    let mut info = env.ledger().get();
    info.timestamp += seconds;
    env.ledger().set(info);
}

/// Add yield to the SY pool by minting extra underlying directly into the
/// adapter contract — simulates accrued Blend lending interest.
fn accrue_yield(f: &Fixture, amount: i128) {
    f.underlying_client.mint(&f.sy_id, &amount);
}

#[test]
fn mint_splits_one_sy_into_one_pt_and_one_yt_at_par() {
    let f = setup();
    let (pt, yt) = f.splitter.mint(&f.user_a, &500_000_000i128);
    assert_eq!(pt, 500_000_000i128);
    assert_eq!(yt, 500_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_a), 500_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_a), 500_000_000i128);
    assert_eq!(f.splitter.total_supply(), 500_000_000i128);
    assert_eq!(f.sy.balance(&f.splitter_id), 500_000_000i128);
}

#[test]
fn redeem_before_maturity_returns_sy_one_for_one() {
    let f = setup();
    f.splitter.mint(&f.user_a, &500_000_000i128);

    let sy_before = f.sy.balance(&f.user_a);
    let returned = f
        .splitter
        .redeem_before_maturity(&f.user_a, &200_000_000i128);
    assert_eq!(returned, 200_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_a), 300_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_a), 300_000_000i128);
    assert_eq!(f.splitter.total_supply(), 300_000_000i128);
    assert_eq!(f.sy.balance(&f.user_a), sy_before + 200_000_000i128);
}

#[test]
fn yield_accrues_to_yt_holders_proportionally() {
    let f = setup();
    f.splitter.mint(&f.user_a, &1_000_000_000i128);

    let pool_balance = f.underlying_token.balance(&f.sy_id);
    accrue_yield(&f, pool_balance / 10);
    assert_eq!(f.sy.exchange_rate(), 1_100_000_000_000_000_000i128);

    let pending = f.splitter.pending_yield(&f.user_a);
    assert!(
        pending > 90_000_000i128 && pending < 91_000_000i128,
        "got {}",
        pending
    );

    let claimed = f.splitter.claim_yield(&f.user_a);
    assert_eq!(claimed, pending);
    assert_eq!(f.splitter.pending_yield(&f.user_a), 0);
}

#[test]
fn yield_splits_between_two_yt_holders_proportionally() {
    let f = setup();
    f.splitter.mint(&f.user_a, &600_000_000i128);
    f.splitter.mint(&f.user_b, &400_000_000i128);

    let pool_balance = f.underlying_token.balance(&f.sy_id);
    accrue_yield(&f, pool_balance / 10);

    let pending_a = f.splitter.pending_yield(&f.user_a);
    let pending_b = f.splitter.pending_yield(&f.user_b);
    let ratio_a = pending_a * 10 / (pending_a + pending_b);
    assert_eq!(ratio_a, 6);
}

#[test]
fn redeem_at_maturity_returns_principal_only_yt_keeps_yield() {
    let f = setup();
    f.splitter.mint(&f.user_a, &1_000_000_000i128);

    let pool_balance = f.underlying_token.balance(&f.sy_id);
    accrue_yield(&f, pool_balance / 10);

    advance_time(&f.env, NINETY_DAYS + 1);
    f.splitter.sync();
    assert!(f.splitter.is_matured());

    let sy_before = f.sy.balance(&f.user_a);
    let returned = f
        .splitter
        .redeem_at_maturity(&f.user_a, &1_000_000_000i128);
    assert!(
        returned >= 909_000_000 && returned <= 909_500_000,
        "got {}",
        returned
    );
    let sy_after = f.sy.balance(&f.user_a);
    assert_eq!(sy_after - sy_before, returned);

    let pending = f.splitter.pending_yield(&f.user_a);
    assert!(pending > 0);
    f.splitter.claim_yield(&f.user_a);
    assert_eq!(f.splitter.pending_yield(&f.user_a), 0);
}

#[test]
fn yt_transfer_settles_yield_for_sender() {
    let f = setup();
    f.splitter.mint(&f.user_a, &1_000_000_000i128);
    let pool_balance = f.underlying_token.balance(&f.sy_id);
    accrue_yield(&f, pool_balance / 10);

    let pre_unclaimed = f.splitter.pending_yield(&f.user_a);
    assert!(pre_unclaimed > 0);

    f.splitter
        .yt_transfer(&f.user_a, &f.user_b, &500_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_a), 500_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_b), 500_000_000i128);

    assert_eq!(f.splitter.pending_yield(&f.user_a), pre_unclaimed);
    assert_eq!(f.splitter.pending_yield(&f.user_b), 0);
}

#[test]
fn pt_and_yt_transfers_are_independent() {
    let f = setup();
    f.splitter.mint(&f.user_a, &500_000_000i128);

    f.splitter
        .pt_transfer(&f.user_a, &f.user_b, &100_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_a), 400_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_b), 100_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_a), 500_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_b), 0);
}

#[test]
fn pt_approve_and_transfer_from_works() {
    let f = setup();
    f.splitter.mint(&f.user_a, &500_000_000i128);
    f.splitter
        .pt_approve(&f.user_a, &f.user_b, &200_000_000i128);
    f.splitter
        .pt_transfer_from(&f.user_b, &f.user_a, &f.user_b, &150_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_a), 350_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_b), 150_000_000i128);
    assert_eq!(
        f.splitter.pt_allowance(&f.user_a, &f.user_b),
        50_000_000i128
    );
}

#[test]
fn minter_can_mint_and_burn_pt_yt() {
    let f = setup();
    let minter = Address::generate(&f.env);
    f.splitter.set_minter(&minter, &true);

    f.splitter
        .minter_mint(&minter, &f.user_a, &300_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_a), 300_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_a), 300_000_000i128);
    assert_eq!(f.splitter.total_supply(), 300_000_000i128);

    f.splitter
        .minter_burn(&minter, &f.user_a, &100_000_000i128);
    assert_eq!(f.splitter.pt_balance(&f.user_a), 200_000_000i128);
    assert_eq!(f.splitter.yt_balance(&f.user_a), 200_000_000i128);
    assert_eq!(f.splitter.total_supply(), 200_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn non_minter_cannot_call_minter_mint() {
    let f = setup();
    let stranger = Address::generate(&f.env);
    f.splitter
        .minter_mint(&stranger, &f.user_a, &100_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn redeem_at_maturity_fails_before_maturity() {
    let f = setup();
    f.splitter.mint(&f.user_a, &500_000_000i128);
    f.splitter
        .redeem_at_maturity(&f.user_a, &100_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn mint_fails_after_maturity() {
    let f = setup();
    advance_time(&f.env, NINETY_DAYS + 1);
    f.splitter.mint(&f.user_a, &500_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn mint_blocked_when_paused() {
    let f = setup();
    f.splitter.set_paused(&true);
    f.splitter.mint(&f.user_a, &500_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn redeem_before_maturity_fails_without_enough_pt() {
    let f = setup();
    f.splitter.mint(&f.user_a, &500_000_000i128);
    f.splitter
        .pt_transfer(&f.user_a, &f.user_b, &500_000_000i128);
    f.splitter
        .redeem_before_maturity(&f.user_a, &10_000_000i128);
}

#[test]
fn sync_after_maturity_freezes_py_index() {
    let f = setup();
    f.splitter.mint(&f.user_a, &1_000_000_000i128);

    let pool_balance = f.underlying_token.balance(&f.sy_id);
    accrue_yield(&f, pool_balance / 10);
    advance_time(&f.env, NINETY_DAYS + 1);
    f.splitter.sync();
    let frozen = f.splitter.py_index();
    assert_eq!(frozen, 1_100_000_000_000_000_000i128);

    let pool_balance = f.underlying_token.balance(&f.sy_id);
    accrue_yield(&f, pool_balance / 10);
    f.splitter.sync();
    assert_eq!(f.splitter.py_index(), frozen);
}

#[test]
fn pending_yield_unchanged_when_rate_doesnt_grow() {
    let f = setup();
    f.splitter.mint(&f.user_a, &500_000_000i128);
    let before = f.splitter.pending_yield(&f.user_a);
    f.splitter.sync();
    let after = f.splitter.pending_yield(&f.user_a);
    assert_eq!(before, after);
    assert_eq!(after, 0);
}

#[test]
fn metadata_is_persisted() {
    let f = setup();
    assert_eq!(f.splitter.maturity(), f.maturity);
    assert_eq!(f.splitter.sy_token(), f.sy_id);
    assert_eq!(f.splitter.admin(), f.admin);
    assert_eq!(f.splitter.decimals(), 7u32);
    assert_eq!(f.splitter.py_index(), WAD);
    let _ = f.underlying_id;
}
