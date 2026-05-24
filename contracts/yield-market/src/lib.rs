#![no_std]

mod types;

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, panic_with_error, symbol_short,
    Address, Env,
};
use yield_math::amm::{
    get_dynamic_fee, get_dynamic_scalar, get_exchange_rate, get_implied_rate, update_anchor,
};
use yield_math::constants::WAD;
use yield_math::logit::logit;
use yield_math::transcendental::sqrt_wad;
use yield_math::wad::{mul_div, wad_div};

pub use types::{AllowanceKey, DataKey, MarketConfig, MarketState};

pub const TTL_LOW: u32 = 17_280;
pub const TTL_BUMP: u32 = 535_680;
const MIN_PROPORTION: i128 = WAD / 100;       // 1%
const MAX_PROPORTION: i128 = WAD * 99 / 100;  // 99%

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    InvalidAmount = 4,
    InsufficientLp = 5,
    Paused = 6,
    Matured = 7,
    SlippageExceeded = 8,
    BadProportion = 9,
    InsufficientLiquidity = 10,
    PoolEmpty = 11,
}

#[contractclient(name = "SyClient")]
pub trait SyTokenInterface {
    fn exchange_rate(env: Env) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, address: Address) -> i128;
}

#[contractclient(name = "SplitterClient")]
pub trait SplitterInterface {
    fn py_index(env: Env) -> i128;
    fn sync(env: Env);
    fn pt_balance(env: Env, addr: Address) -> i128;
    fn pt_transfer(env: Env, from: Address, to: Address, amount: i128);
    fn yt_transfer(env: Env, from: Address, to: Address, amount: i128);
    fn yt_transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
    fn minter_mint(env: Env, caller: Address, to: Address, amount: i128);
    fn minter_burn(env: Env, caller: Address, from: Address, amount: i128);
}

#[contract]
pub struct YieldMarket;

#[contractimpl]
impl YieldMarket {
    pub fn initialize(
        env: Env,
        admin: Address,
        sy_token: Address,
        splitter: Address,
        maturity: u64,
        scalar_root: i128,
        fee_rate_root: i128,
        anchor_init: i128,
    ) {
        let store = env.storage().instance();
        if store.has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();

        let now = env.ledger().timestamp();
        if maturity <= now {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let period_size = maturity - now;

        store.set(&DataKey::Admin, &admin);
        store.set(&DataKey::SyToken, &sy_token);
        store.set(&DataKey::Splitter, &splitter);
        store.set(&DataKey::Maturity, &maturity);
        store.set(&DataKey::CreatedAt, &now);
        store.set(&DataKey::PeriodSize, &period_size);
        store.set(&DataKey::ScalarRoot, &scalar_root);
        store.set(&DataKey::FeeRateRoot, &fee_rate_root);
        store.set(&DataKey::Anchor, &anchor_init);
        store.set(&DataKey::LastImpliedRate, &0i128);
        store.set(&DataKey::TotalSy, &0i128);
        store.set(&DataKey::TotalPt, &0i128);
        store.set(&DataKey::LpSupply, &0i128);
        store.set(&DataKey::Paused, &false);
        store.extend_ttl(TTL_LOW, TTL_BUMP);
    }

    pub fn set_paused(env: Env, paused: bool) {
        let admin = read_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &paused);
        env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
    }

    /// First call seeds the pool at the caller's ratio (sets initial implied
    /// rate to match anchor_init). Subsequent calls deposit at the current
    /// pool proportion using the smaller of the two amounts as the binding
    /// side.
    pub fn add_liquidity(env: Env, caller: Address, sy_in: i128, pt_in: i128) -> i128 {
        caller.require_auth();
        ensure_active(&env);
        ensure_not_matured(&env);
        ensure_positive(&env, sy_in);
        ensure_positive(&env, pt_in);

        let (total_sy, total_pt, lp_supply) = read_pool(&env);

        let (sy_used, pt_used, lp_minted) = if lp_supply == 0 {
            let lp = sqrt_wad(mul_div(sy_in, pt_in, WAD));
            let py_index = read_py_index(&env);
            let prop = compute_proportion(pt_in, sy_in, py_index);
            ensure_proportion_in_bounds(&env, prop);
            (sy_in, pt_in, lp)
        } else {
            let r_sy = mul_div(sy_in, lp_supply, total_sy);
            let r_pt = mul_div(pt_in, lp_supply, total_pt);
            let lp = if r_sy < r_pt { r_sy } else { r_pt };
            let sy_actual = mul_div(lp, total_sy, lp_supply);
            let pt_actual = mul_div(lp, total_pt, lp_supply);
            (sy_actual, pt_actual, lp)
        };

        if lp_minted <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let sy_addr = read_sy(&env);
        let splitter_addr = read_splitter(&env);
        let market_addr = env.current_contract_address();
        SyClient::new(&env, &sy_addr).transfer(&caller, &market_addr, &sy_used);
        SplitterClient::new(&env, &splitter_addr).pt_transfer(&caller, &market_addr, &pt_used);

        write_pool(
            &env,
            total_sy + sy_used,
            total_pt + pt_used,
            lp_supply + lp_minted,
        );
        credit_lp(&env, &caller, lp_minted);
        snapshot_implied_rate(&env);

        env.events().publish(
            (symbol_short!("addlp"), caller.clone()),
            (sy_used, pt_used, lp_minted),
        );
        lp_minted
    }

    pub fn remove_liquidity(env: Env, caller: Address, lp_amount: i128) -> (i128, i128) {
        caller.require_auth();
        ensure_active(&env);
        ensure_positive(&env, lp_amount);

        let (total_sy, total_pt, lp_supply) = read_pool(&env);
        if lp_supply <= 0 {
            panic_with_error!(&env, Error::PoolEmpty);
        }

        let sy_out = mul_div(lp_amount, total_sy, lp_supply);
        let pt_out = mul_div(lp_amount, total_pt, lp_supply);

        debit_lp(&env, &caller, lp_amount);
        write_pool(
            &env,
            total_sy - sy_out,
            total_pt - pt_out,
            lp_supply - lp_amount,
        );

        let sy_addr = read_sy(&env);
        let splitter_addr = read_splitter(&env);
        let market_addr = env.current_contract_address();
        SyClient::new(&env, &sy_addr).transfer(&market_addr, &caller, &sy_out);
        SplitterClient::new(&env, &splitter_addr).pt_transfer(&market_addr, &caller, &pt_out);

        env.events().publish(
            (symbol_short!("rmlp"), caller.clone()),
            (sy_out, pt_out, lp_amount),
        );
        (sy_out, pt_out)
    }

    /// User buys exact PT with SY (pays at most `max_sy_in`).
    pub fn swap_sy_for_exact_pt(
        env: Env,
        caller: Address,
        pt_out: i128,
        max_sy_in: i128,
    ) -> i128 {
        caller.require_auth();
        ensure_active(&env);
        ensure_not_matured(&env);
        ensure_positive(&env, pt_out);
        ensure_positive(&env, max_sy_in);

        let py_index = read_py_index(&env);
        let (total_sy, total_pt, _) = read_pool(&env);
        adjust_anchor_pre_trade(&env, total_pt, total_sy, py_index);

        let sy_asset = mul_div(total_sy, py_index, WAD);
        let new_total_pt = total_pt - pt_out;
        if new_total_pt <= 0 {
            panic_with_error!(&env, Error::InsufficientLiquidity);
        }
        let denominator = total_pt + sy_asset;
        let new_prop = wad_div(new_total_pt, denominator);
        ensure_proportion_in_bounds(&env, new_prop);

        let scalar = current_scalar(&env);
        let fee = current_fee(&env);
        let anchor = read_anchor(&env);
        let trade_rate = wad_div(logit(new_prop), scalar) + anchor - fee;
        if trade_rate <= 0 {
            panic_with_error!(&env, Error::BadProportion);
        }

        let sy_in_asset = wad_div(pt_out, trade_rate);
        let sy_in_tokens = mul_div(sy_in_asset, WAD, py_index);
        if sy_in_tokens > max_sy_in {
            panic_with_error!(&env, Error::SlippageExceeded);
        }

        let sy_addr = read_sy(&env);
        let splitter_addr = read_splitter(&env);
        let market_addr = env.current_contract_address();
        SyClient::new(&env, &sy_addr).transfer(&caller, &market_addr, &sy_in_tokens);
        SplitterClient::new(&env, &splitter_addr).pt_transfer(&market_addr, &caller, &pt_out);

        write_pool(
            &env,
            total_sy + sy_in_tokens,
            total_pt - pt_out,
            read_lp_supply(&env),
        );
        snapshot_implied_rate(&env);

        env.events().publish(
            (symbol_short!("buy_pt"), caller.clone()),
            (pt_out, sy_in_tokens),
        );
        sy_in_tokens
    }

    /// User sells exact PT for SY (receives at least `min_sy_out`).
    pub fn swap_exact_pt_for_sy(
        env: Env,
        caller: Address,
        pt_in: i128,
        min_sy_out: i128,
    ) -> i128 {
        caller.require_auth();
        ensure_active(&env);
        ensure_not_matured(&env);
        ensure_positive(&env, pt_in);

        let py_index = read_py_index(&env);
        let (total_sy, total_pt, _) = read_pool(&env);
        adjust_anchor_pre_trade(&env, total_pt, total_sy, py_index);

        let sy_asset = mul_div(total_sy, py_index, WAD);
        let new_total_pt = total_pt + pt_in;
        let denominator = total_pt + sy_asset;
        let new_prop = wad_div(new_total_pt, denominator);
        ensure_proportion_in_bounds(&env, new_prop);

        let scalar = current_scalar(&env);
        let fee = current_fee(&env);
        let anchor = read_anchor(&env);
        let trade_rate = wad_div(logit(new_prop), scalar) + anchor + fee;
        if trade_rate <= 0 {
            panic_with_error!(&env, Error::BadProportion);
        }

        let sy_out_asset = wad_div(pt_in, trade_rate);
        let sy_out_tokens = mul_div(sy_out_asset, WAD, py_index);
        if sy_out_tokens < min_sy_out {
            panic_with_error!(&env, Error::SlippageExceeded);
        }
        if sy_out_tokens > total_sy {
            panic_with_error!(&env, Error::InsufficientLiquidity);
        }

        let sy_addr = read_sy(&env);
        let splitter_addr = read_splitter(&env);
        let market_addr = env.current_contract_address();
        SplitterClient::new(&env, &splitter_addr).pt_transfer(&caller, &market_addr, &pt_in);
        SyClient::new(&env, &sy_addr).transfer(&market_addr, &caller, &sy_out_tokens);

        write_pool(
            &env,
            total_sy - sy_out_tokens,
            total_pt + pt_in,
            read_lp_supply(&env),
        );
        snapshot_implied_rate(&env);

        env.events().publish(
            (symbol_short!("sell_pt"), caller.clone()),
            (pt_in, sy_out_tokens),
        );
        sy_out_tokens
    }

    /// Flash swap: user sells `yt_in` YT for SY (the upfront fixed-yield path).
    /// The market burns the YT against its own PT via Splitter.minter_burn,
    /// recovering SY; the user receives the "yield portion" of that SY while
    /// the pool keeps the "principal portion" — effectively buying yt_in PT
    /// off the curve at the trade rate.
    pub fn swap_exact_yt_for_sy(
        env: Env,
        caller: Address,
        yt_in: i128,
        min_sy_out: i128,
    ) -> i128 {
        caller.require_auth();
        ensure_active(&env);
        ensure_not_matured(&env);
        ensure_positive(&env, yt_in);

        let py_index = read_py_index(&env);
        let (total_sy, total_pt, _) = read_pool(&env);
        adjust_anchor_pre_trade(&env, total_pt, total_sy, py_index);

        let sy_asset = mul_div(total_sy, py_index, WAD);
        let new_total_pt_asset = total_pt - yt_in;
        if new_total_pt_asset <= 0 {
            panic_with_error!(&env, Error::InsufficientLiquidity);
        }
        let denominator = total_pt + sy_asset;
        let new_prop = wad_div(new_total_pt_asset, denominator);
        ensure_proportion_in_bounds(&env, new_prop);

        let scalar = current_scalar(&env);
        let fee = current_fee(&env);
        let anchor = read_anchor(&env);
        let trade_rate = wad_div(logit(new_prop), scalar) + anchor - fee;
        if trade_rate <= 0 {
            panic_with_error!(&env, Error::BadProportion);
        }

        // Pool "spends" sy_swap_asset (asset units) to buy yt_in PT.
        let sy_swap_asset = wad_div(yt_in, trade_rate);
        let sy_swap_tokens = mul_div(sy_swap_asset, WAD, py_index);

        // SY recovered by burning yt_in PT + yt_in YT via Splitter.
        let sy_recovered_tokens = mul_div(yt_in, WAD, py_index);

        if sy_recovered_tokens <= sy_swap_tokens {
            panic_with_error!(&env, Error::InsufficientLiquidity);
        }
        let sy_out_tokens = sy_recovered_tokens - sy_swap_tokens;
        if sy_out_tokens < min_sy_out {
            panic_with_error!(&env, Error::SlippageExceeded);
        }

        let splitter_addr = read_splitter(&env);
        let sy_addr = read_sy(&env);
        let market_addr = env.current_contract_address();

        // Pull yt_in YT from caller to the market.
        SplitterClient::new(&env, &splitter_addr).yt_transfer_from(
            &market_addr,
            &caller,
            &market_addr,
            &yt_in,
        );
        // Burn yt_in PT + yt_in YT from the market, recovering SY into the market.
        SplitterClient::new(&env, &splitter_addr).minter_burn(
            &market_addr,
            &market_addr,
            &yt_in,
        );
        // Send sy_out to user; the remainder stays in pool reserves.
        SyClient::new(&env, &sy_addr).transfer(&market_addr, &caller, &sy_out_tokens);

        // Pool state: total_pt -= yt_in (PT burned), total_sy += sy_swap_tokens
        let new_total_sy = total_sy + sy_swap_tokens;
        let new_total_pt = total_pt - yt_in;
        write_pool(&env, new_total_sy, new_total_pt, read_lp_supply(&env));
        snapshot_implied_rate(&env);

        env.events().publish(
            (symbol_short!("sell_yt"), caller.clone()),
            (yt_in, sy_out_tokens),
        );
        sy_out_tokens
    }

    /// View: pool implied annualized rate (WAD).
    pub fn implied_rate(env: Env) -> i128 {
        let (total_sy, total_pt, _) = read_pool(&env);
        if total_sy == 0 || total_pt == 0 {
            return 0;
        }
        let py_index = read_py_index(&env);
        let sy_asset = mul_div(total_sy, py_index, WAD);
        let scalar = current_scalar(&env);
        let anchor = read_anchor(&env);
        let er = get_exchange_rate(total_pt, sy_asset, scalar, anchor);
        let period_size = read_period_size(&env);
        let ttm = read_ttm(&env);
        get_implied_rate(er, period_size, ttm)
    }

    pub fn state(env: Env) -> MarketState {
        let (total_sy, total_pt, lp_supply) = read_pool(&env);
        MarketState {
            total_sy,
            total_pt,
            lp_supply,
            anchor: read_anchor(&env),
            last_implied_rate: env
                .storage()
                .instance()
                .get(&DataKey::LastImpliedRate)
                .unwrap_or(0),
            maturity: read_maturity(&env),
            created_at: env
                .storage()
                .instance()
                .get(&DataKey::CreatedAt)
                .unwrap_or(0),
        }
    }

    pub fn lp_balance(env: Env, addr: Address) -> i128 {
        read_lp(&env, &addr)
    }

    pub fn lp_supply(env: Env) -> i128 {
        read_lp_supply(&env)
    }

    pub fn maturity(env: Env) -> u64 {
        read_maturity(&env)
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    pub fn sy_token(env: Env) -> Address {
        read_sy(&env)
    }

    pub fn splitter_address(env: Env) -> Address {
        read_splitter(&env)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }
}

/* ------- Helpers ------- */

fn compute_proportion(total_pt: i128, total_sy_tokens: i128, py_index: i128) -> i128 {
    let sy_asset = mul_div(total_sy_tokens, py_index, WAD);
    if total_pt + sy_asset == 0 {
        return 0;
    }
    wad_div(total_pt, total_pt + sy_asset)
}

fn ensure_proportion_in_bounds(env: &Env, prop: i128) {
    if prop <= MIN_PROPORTION || prop >= MAX_PROPORTION {
        panic_with_error!(env, Error::BadProportion);
    }
}

fn adjust_anchor_pre_trade(env: &Env, total_pt: i128, total_sy: i128, py_index: i128) {
    let last_rate: i128 = env
        .storage()
        .instance()
        .get(&DataKey::LastImpliedRate)
        .unwrap_or(0);
    if last_rate == 0 || total_pt == 0 || total_sy == 0 {
        return;
    }
    let sy_asset = mul_div(total_sy, py_index, WAD);
    let scalar = current_scalar(env);
    let anchor = read_anchor(env);
    let er = get_exchange_rate(total_pt, sy_asset, scalar, anchor);
    let period_size = read_period_size(env);
    let ttm = read_ttm(env);
    let new_anchor = update_anchor(er, last_rate, anchor, period_size, ttm);
    env.storage().instance().set(&DataKey::Anchor, &new_anchor);
}

fn snapshot_implied_rate(env: &Env) {
    let (total_sy, total_pt, _) = read_pool(env);
    if total_sy == 0 || total_pt == 0 {
        return;
    }
    let py_index = read_py_index(env);
    let sy_asset = mul_div(total_sy, py_index, WAD);
    let scalar = current_scalar(env);
    let anchor = read_anchor(env);
    let er = get_exchange_rate(total_pt, sy_asset, scalar, anchor);
    let period_size = read_period_size(env);
    let ttm = read_ttm(env);
    let rate = get_implied_rate(er, period_size, ttm);
    env.storage()
        .instance()
        .set(&DataKey::LastImpliedRate, &rate);
}

fn read_pool(env: &Env) -> (i128, i128, i128) {
    let total_sy: i128 = env
        .storage()
        .instance()
        .get(&DataKey::TotalSy)
        .unwrap_or(0);
    let total_pt: i128 = env
        .storage()
        .instance()
        .get(&DataKey::TotalPt)
        .unwrap_or(0);
    let lp = read_lp_supply(env);
    (total_sy, total_pt, lp)
}

fn write_pool(env: &Env, total_sy: i128, total_pt: i128, lp_supply: i128) {
    env.storage().instance().set(&DataKey::TotalSy, &total_sy);
    env.storage().instance().set(&DataKey::TotalPt, &total_pt);
    env.storage().instance().set(&DataKey::LpSupply, &lp_supply);
    env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
}

fn read_lp_supply(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::LpSupply)
        .unwrap_or(0)
}

fn read_lp(env: &Env, addr: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::LpBalance(addr.clone()))
        .unwrap_or(0)
}

fn credit_lp(env: &Env, addr: &Address, amount: i128) {
    let bal = read_lp(env, addr);
    let key = DataKey::LpBalance(addr.clone());
    env.storage().persistent().set(&key, &(bal + amount));
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_LOW, TTL_BUMP);
}

fn debit_lp(env: &Env, addr: &Address, amount: i128) {
    let bal = read_lp(env, addr);
    if bal < amount {
        panic_with_error!(env, Error::InsufficientLp);
    }
    let key = DataKey::LpBalance(addr.clone());
    let remaining = bal - amount;
    if remaining == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &remaining);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_sy(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::SyToken)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_splitter(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Splitter)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_maturity(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::Maturity)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_period_size(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::PeriodSize)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_anchor(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::Anchor)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_py_index(env: &Env) -> i128 {
    let splitter_addr = read_splitter(env);
    SplitterClient::new(env, &splitter_addr).sync();
    SplitterClient::new(env, &splitter_addr).py_index()
}

fn read_ttm(env: &Env) -> u64 {
    let now = env.ledger().timestamp();
    let maturity = read_maturity(env);
    if now >= maturity {
        1
    } else {
        maturity - now
    }
}

fn current_scalar(env: &Env) -> i128 {
    let scalar_root: i128 = env
        .storage()
        .instance()
        .get(&DataKey::ScalarRoot)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized));
    let period_size = read_period_size(env);
    let ttm = read_ttm(env);
    get_dynamic_scalar(scalar_root, period_size, ttm)
}

fn current_fee(env: &Env) -> i128 {
    let fee_root: i128 = env
        .storage()
        .instance()
        .get(&DataKey::FeeRateRoot)
        .unwrap_or(0);
    let period_size = read_period_size(env);
    let ttm = read_ttm(env);
    get_dynamic_fee(fee_root, period_size, ttm)
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

fn ensure_not_matured(env: &Env) {
    if env.ledger().timestamp() >= read_maturity(env) {
        panic_with_error!(env, Error::Matured);
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
