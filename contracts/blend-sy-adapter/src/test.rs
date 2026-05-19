#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, MockAuth, MockAuthInvoke};
use soroban_sdk::{token, Address, Env, IntoVal, String};
use yield_math::constants::WAD;

struct Fixture<'a> {
    env: Env,
    admin: Address,
    user_a: Address,
    user_b: Address,
    underlying_id: Address,
    adapter_id: Address,
    adapter: BlendSyAdapterClient<'a>,
    underlying: token::StellarAssetClient<'a>,
    underlying_token: token::TokenClient<'a>,
}

fn setup<'a>() -> Fixture<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let underlying_admin = Address::generate(&env);

    let underlying_id = env
        .register_stellar_asset_contract_v2(underlying_admin.clone())
        .address();
    let underlying = token::StellarAssetClient::new(&env, &underlying_id);
    let underlying_token = token::TokenClient::new(&env, &underlying_id);

    let adapter_id = env.register_contract(None, BlendSyAdapter);
    let adapter = BlendSyAdapterClient::new(&env, &adapter_id);

    adapter.initialize(
        &admin,
        &underlying_id,
        &7u32,
        &String::from_str(&env, "Pesalo SY-bUSDC"),
        &String::from_str(&env, "SYbUSDC"),
    );

    underlying.mint(&user_a, &1_000_000_000_000i128);
    underlying.mint(&user_b, &1_000_000_000_000i128);

    let _ = underlying_admin;

    Fixture {
        env,
        admin,
        user_a,
        user_b,
        underlying_id,
        adapter_id,
        adapter,
        underlying,
        underlying_token,
    }
}

#[test]
fn deposit_first_mints_one_for_one() {
    let f = setup();
    let minted = f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    assert_eq!(minted, 1_000_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_a), 1_000_000_000i128);
    assert_eq!(f.adapter.total_supply(), 1_000_000_000i128);
    assert_eq!(f.adapter.exchange_rate(), WAD);
    assert_eq!(f.underlying_token.balance(&f.adapter_id), 1_000_000_000i128);
}

#[test]
fn redeem_returns_underlying_one_for_one_no_yield() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);

    let pre_balance = f.underlying_token.balance(&f.user_a);
    let returned = f.adapter.redeem(&f.user_a, &400_000_000i128);

    assert_eq!(returned, 400_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_a), 600_000_000i128);
    assert_eq!(f.adapter.total_supply(), 600_000_000i128);
    assert_eq!(
        f.underlying_token.balance(&f.user_a),
        pre_balance + 400_000_000i128
    );
}

#[test]
fn exchange_rate_grows_when_yield_accrues() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);

    // Simulate Blend yield: extra underlying flows into the adapter contract.
    f.underlying.mint(&f.adapter_id, &100_000_000i128);

    // Exchange rate = pool / supply = 1.1e9 / 1.0e9 = 1.1 * WAD
    let rate = f.adapter.exchange_rate();
    assert_eq!(rate, 1_100_000_000_000_000_000i128);
}

#[test]
fn second_deposit_mints_proportional_sy_after_yield() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    // 10% yield accrues
    f.underlying.mint(&f.adapter_id, &100_000_000i128);

    // user_b deposits the same nominal amount; should receive fewer SY shares
    let minted = f.adapter.deposit(&f.user_b, &1_100_000_000i128);
    // SY minted = 1.1e9 * 1.0e9 / 1.1e9 = 1.0e9
    assert_eq!(minted, 1_000_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_b), 1_000_000_000i128);
}

#[test]
fn redeem_after_yield_returns_proportional_underlying() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    f.underlying.mint(&f.adapter_id, &100_000_000i128); // 10% yield

    let pre = f.underlying_token.balance(&f.user_a);
    let returned = f.adapter.redeem(&f.user_a, &500_000_000i128);
    // Pool = 1.1e9, supply = 1e9. Burning 5e8 returns 5e8 * 1.1e9 / 1e9 = 5.5e8
    assert_eq!(returned, 550_000_000i128);
    assert_eq!(f.underlying_token.balance(&f.user_a), pre + 550_000_000i128);
}

#[test]
fn transfer_moves_sy_between_accounts() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    f.adapter.transfer(&f.user_a, &f.user_b, &300_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_a), 700_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_b), 300_000_000i128);
}

#[test]
fn approve_and_transfer_from_works() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    f.adapter.approve(&f.user_a, &f.user_b, &500_000_000i128);
    assert_eq!(f.adapter.allowance(&f.user_a, &f.user_b), 500_000_000i128);

    f.adapter
        .transfer_from(&f.user_b, &f.user_a, &f.user_b, &200_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_a), 800_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_b), 200_000_000i128);
    assert_eq!(f.adapter.allowance(&f.user_a, &f.user_b), 300_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn transfer_from_panics_without_allowance() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    f.adapter
        .transfer_from(&f.user_b, &f.user_a, &f.user_b, &100_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn deposit_panics_on_zero() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn transfer_panics_on_insufficient_balance() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &500_000_000i128);
    f.adapter
        .transfer(&f.user_a, &f.user_b, &600_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn redeem_panics_when_supply_is_zero() {
    let f = setup();
    f.adapter.redeem(&f.user_a, &100_000_000i128);
}

#[test]
fn minter_can_mint_and_burn_sy_directly() {
    let f = setup();
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);

    let minter = Address::generate(&f.env);
    f.adapter.set_minter(&minter, &true);
    f.adapter.mint(&minter, &f.user_b, &250_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_b), 250_000_000i128);

    f.adapter.burn(&minter, &f.user_b, &100_000_000i128);
    assert_eq!(f.adapter.balance(&f.user_b), 150_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn non_minter_cannot_mint_sy() {
    let f = setup();
    let stranger = Address::generate(&f.env);
    f.adapter.mint(&stranger, &f.user_b, &100_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn deposit_blocked_when_paused() {
    let f = setup();
    f.adapter.set_paused(&true);
    f.adapter.deposit(&f.user_a, &100_000_000i128);
}

#[test]
fn metadata_round_trips() {
    let f = setup();
    assert_eq!(f.adapter.decimals(), 7u32);
    assert_eq!(
        f.adapter.name(),
        String::from_str(&f.env, "Pesalo SY-bUSDC")
    );
    assert_eq!(f.adapter.symbol(), String::from_str(&f.env, "SYbUSDC"));
    assert_eq!(f.adapter.admin(), f.admin);
    assert_eq!(f.adapter.underlying(), f.underlying_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn initialize_twice_panics() {
    let f = setup();
    f.adapter.initialize(
        &f.admin,
        &f.underlying_id,
        &7u32,
        &String::from_str(&f.env, "x"),
        &String::from_str(&f.env, "x"),
    );
}

#[test]
fn deposit_requires_underlying_auth_for_transfer() {
    // Disable the global mock so we can validate auth explicitly.
    let env = Env::default();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let underlying_admin = Address::generate(&env);
    let underlying_id = env
        .register_stellar_asset_contract_v2(underlying_admin.clone())
        .address();
    let underlying = token::StellarAssetClient::new(&env, &underlying_id);
    let underlying_token = token::TokenClient::new(&env, &underlying_id);

    let adapter_id = env.register_contract(None, BlendSyAdapter);
    let adapter = BlendSyAdapterClient::new(&env, &adapter_id);

    // initialize asks for admin auth
    adapter
        .mock_auths(&[MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &adapter_id,
                fn_name: "initialize",
                args: (
                    admin.clone(),
                    underlying_id.clone(),
                    7u32,
                    String::from_str(&env, "Pesalo SY-bUSDC"),
                    String::from_str(&env, "SYbUSDC"),
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .initialize(
            &admin,
            &underlying_id,
            &7u32,
            &String::from_str(&env, "Pesalo SY-bUSDC"),
            &String::from_str(&env, "SYbUSDC"),
        );

    // mint underlying to the user (asset contract admin)
    env.mock_all_auths();
    underlying.mint(&user, &500_000_000i128);

    // deposit asks for user auth + sub-auth on token.transfer
    let minted = adapter.deposit(&user, &500_000_000i128);
    assert_eq!(minted, 500_000_000i128);
    assert_eq!(underlying_token.balance(&adapter_id), 500_000_000i128);

    // suppress unused warnings on shared fixture struct
    let _ = (admin, underlying_admin);
}

/* ------- Blend delegate mode ------- */

mod mock_blend {
    use super::*;
    use soroban_sdk::{contract, contractimpl, contracttype, token};

    #[derive(Clone)]
    #[contracttype]
    pub enum DataKey {
        Supply(Address),
        Rate,
    }

    /// Minimal Blend pool fixture: tracks each user's underlying-denominated
    /// supply and applies an admin-driven "interest" factor. Mirrors the
    /// Blend Capital V2 `submit` + `underlying_balance` surface that our
    /// adapter targets in production.
    #[contract]
    pub struct MockBlendPool;

    #[contractimpl]
    impl MockBlendPool {
        pub fn submit(
            env: Env,
            from: Address,
            _spender: Address,
            to: Address,
            requests: Vec<BlendRequest>,
        ) {
            from.require_auth();
            for req in requests.iter() {
                let underlying = req.address.clone();
                let tok = token::Client::new(&env, &underlying);
                let pool_addr = env.current_contract_address();
                if req.request_type == BLEND_REQ_SUPPLY {
                    tok.transfer(&from, &pool_addr, &req.amount);
                    let supply: i128 = env
                        .storage()
                        .persistent()
                        .get(&DataKey::Supply(from.clone()))
                        .unwrap_or(0);
                    env.storage()
                        .persistent()
                        .set(&DataKey::Supply(from.clone()), &(supply + req.amount));
                } else if req.request_type == BLEND_REQ_WITHDRAW {
                    let scaled = scaled_balance(&env, &from);
                    if scaled < req.amount {
                        panic!("withdraw exceeds supply");
                    }
                    let rate = current_rate(&env);
                    let underlying_units = mul_div(req.amount, WAD, rate);
                    let supply: i128 = env
                        .storage()
                        .persistent()
                        .get(&DataKey::Supply(from.clone()))
                        .unwrap_or(0);
                    env.storage()
                        .persistent()
                        .set(&DataKey::Supply(from.clone()), &(supply - underlying_units));
                    tok.transfer(&pool_addr, &to, &req.amount);
                } else {
                    panic!("unsupported request type");
                }
            }
        }

        pub fn underlying_balance(env: Env, user: Address, _asset: Address) -> i128 {
            scaled_balance(&env, &user)
        }

        /// Test-only: scale every supply up by `factor / WAD`, simulating
        /// Blend's b_rate growth.
        pub fn accrue(env: Env, factor: i128) {
            let current = current_rate(&env);
            let next = mul_div(current, factor, WAD);
            env.storage().instance().set(&DataKey::Rate, &next);
        }
    }

    fn current_rate(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::Rate).unwrap_or(WAD)
    }

    fn scaled_balance(env: &Env, user: &Address) -> i128 {
        let raw: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Supply(user.clone()))
            .unwrap_or(0);
        mul_div(raw, current_rate(env), WAD)
    }
}

fn blend_setup<'a>() -> Fixture<'a> {
    let f = setup();
    f.env.mock_all_auths_allowing_non_root_auth();
    f
}

#[test]
fn blend_mode_deposit_forwards_underlying_to_pool() {
    let f = blend_setup();
    let pool_id = f.env.register_contract(None, mock_blend::MockBlendPool);
    f.adapter.set_blend_pool(&pool_id);
    assert_eq!(f.adapter.blend_pool(), Some(pool_id.clone()));

    let minted = f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    assert_eq!(minted, 1_000_000_000i128);
    // Pool now holds the underlying, not the adapter.
    assert_eq!(f.underlying_token.balance(&pool_id), 1_000_000_000i128);
    assert_eq!(f.underlying_token.balance(&f.adapter_id), 0);
    assert_eq!(f.adapter.underlying_value(), 1_000_000_000i128);
}

#[test]
fn blend_mode_exchange_rate_grows_with_pool_accrual() {
    let f = blend_setup();
    let pool_id = f.env.register_contract(None, mock_blend::MockBlendPool);
    let mock_pool = mock_blend::MockBlendPoolClient::new(&f.env, &pool_id);

    f.adapter.set_blend_pool(&pool_id);
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);

    // 10% yield accrual inside Blend
    mock_pool.accrue(&1_100_000_000_000_000_000i128);

    assert_eq!(f.adapter.underlying_value(), 1_100_000_000i128);
    assert_eq!(
        f.adapter.exchange_rate(),
        1_100_000_000_000_000_000i128
    );
}

#[test]
fn blend_mode_redeem_pulls_underlying_back_to_user() {
    let f = blend_setup();
    let pool_id = f.env.register_contract(None, mock_blend::MockBlendPool);
    let mock_pool = mock_blend::MockBlendPoolClient::new(&f.env, &pool_id);

    f.adapter.set_blend_pool(&pool_id);
    f.adapter.deposit(&f.user_a, &1_000_000_000i128);
    mock_pool.accrue(&1_100_000_000_000_000_000i128); // 10% yield

    let pre = f.underlying_token.balance(&f.user_a);
    let returned = f.adapter.redeem(&f.user_a, &500_000_000i128);
    // Pool value at time of redeem = 1.1e9; sy_amount * pool/supply = 5.5e8
    assert_eq!(returned, 550_000_000i128);
    assert_eq!(f.underlying_token.balance(&f.user_a), pre + returned);
    assert_eq!(f.underlying_token.balance(&f.adapter_id), 0);
}
