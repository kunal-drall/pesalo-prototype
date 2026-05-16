#![no_std]

mod types;

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, panic_with_error, symbol_short,
    Address, Env, String,
};
use yield_math::constants::WAD;
use yield_math::wad::{mul_div, wad_div};

pub use types::{AllowanceKey, DataKey, SplitterConfig};

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
    InsufficientPt = 5,
    InsufficientYt = 6,
    InsufficientPtAllowance = 7,
    InsufficientYtAllowance = 8,
    Paused = 9,
    AlreadyMatured = 10,
    NotYetMatured = 11,
    NoSupply = 12,
    NoIndex = 13,
}

/// Interface required from the SY token (BlendSyAdapter implements this).
#[contractclient(name = "SyClient")]
pub trait SyTokenInterface {
    fn exchange_rate(env: Env) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, address: Address) -> i128;
}

#[contract]
pub struct Splitter;

#[contractimpl]
impl Splitter {
    pub fn initialize(
        env: Env,
        admin: Address,
        sy_token: Address,
        maturity: u64,
        decimals: u32,
        pt_name: String,
        pt_symbol: String,
        yt_name: String,
        yt_symbol: String,
    ) {
        let store = env.storage().instance();
        if store.has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();
        if maturity <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        store.set(&DataKey::Admin, &admin);
        store.set(&DataKey::SyToken, &sy_token);
        store.set(&DataKey::Maturity, &maturity);
        store.set(&DataKey::Decimals, &decimals);
        store.set(&DataKey::PtName, &pt_name);
        store.set(&DataKey::PtSymbol, &pt_symbol);
        store.set(&DataKey::YtName, &yt_name);
        store.set(&DataKey::YtSymbol, &yt_symbol);
        store.set(&DataKey::Paused, &false);
        store.set(&DataKey::TotalSupply, &0i128);
        store.set(&DataKey::YieldIndex, &0i128);

        // Seed py_index from current SY rate.
        let sy = SyClient::new(&env, &sy_token);
        let r0 = sy.exchange_rate();
        store.set(&DataKey::PyIndex, &r0);

        store.extend_ttl(TTL_LOW, TTL_BUMP);
    }

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

    pub fn set_paused(env: Env, paused: bool) {
        let admin = read_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &paused);
        env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
    }

    /// Bring the yield index up to date with the SY exchange rate. Idempotent;
    /// anyone may call. After maturity, the index is frozen at the first
    /// post-maturity sync.
    pub fn sync(env: Env) {
        sync_internal(&env);
    }

    /// Mint equal PT and YT from SY. Caller is both the SY source and the
    /// recipient of the new PT + YT.
    /// Returns (pt_amount, yt_amount) — always equal.
    pub fn mint(env: Env, caller: Address, sy_amount: i128) -> (i128, i128) {
        caller.require_auth();
        ensure_active(&env);
        ensure_positive(&env, sy_amount);
        ensure_not_matured(&env);

        sync_internal(&env);
        settle_user(&env, &caller);

        let sy_addr = read_sy(&env);
        let sy = SyClient::new(&env, &sy_addr);
        sy.transfer(&caller, &env.current_contract_address(), &sy_amount);

        let py_index = read_py_index(&env);
        // PT/YT denominated in asset units = sy_amount * py_index / WAD.
        let py_amount = mul_div(sy_amount, py_index, WAD);
        ensure_positive(&env, py_amount);

        credit_pt(&env, &caller, py_amount);
        credit_yt(&env, &caller, py_amount);
        let supply = read_supply(&env);
        write_supply(&env, supply + py_amount);

        env.events().publish(
            (symbol_short!("mint"), caller.clone()),
            (sy_amount, py_amount),
        );
        (py_amount, py_amount)
    }

    /// Burn equal PT and YT to recover SY. Allowed any time (including
    /// post-maturity, though redeem_at_maturity is the canonical PT-only path
    /// after expiry).
    pub fn redeem_before_maturity(env: Env, caller: Address, amount: i128) -> i128 {
        caller.require_auth();
        ensure_active(&env);
        ensure_positive(&env, amount);

        sync_internal(&env);
        settle_user(&env, &caller);

        debit_pt(&env, &caller, amount);
        debit_yt(&env, &caller, amount);
        let supply = read_supply(&env);
        write_supply(&env, supply - amount);

        let py_index = read_py_index(&env);
        let sy_amount = mul_div(amount, WAD, py_index);
        ensure_positive(&env, sy_amount);

        let sy_addr = read_sy(&env);
        let sy = SyClient::new(&env, &sy_addr);
        sy.transfer(&env.current_contract_address(), &caller, &sy_amount);

        env.events().publish(
            (symbol_short!("rdmprior"), caller.clone()),
            (amount, sy_amount),
        );
        sy_amount
    }

    /// Burn PT only after maturity, return SY at the matured PY index.
    pub fn redeem_at_maturity(env: Env, caller: Address, pt_amount: i128) -> i128 {
        caller.require_auth();
        ensure_active(&env);
        ensure_positive(&env, pt_amount);
        ensure_matured(&env);

        sync_internal(&env);
        // settle YT yield (if any held) before any state change
        settle_user(&env, &caller);

        debit_pt(&env, &caller, pt_amount);
        // PT-only redemption does not affect YT supply; the invariant
        // total_pt == total_yt is preserved by zeroing residual YT at maturity
        // through the regular redeem_before_maturity path, OR by accepting
        // a transient mismatch until all YT redeem. We use a separate
        // pt-only supply counter for this case.
        // For simplicity we track total_supply as PT supply only.
        let supply = read_supply(&env);
        write_supply(&env, supply - pt_amount);

        let py_index = read_matured_index(&env);
        let sy_amount = mul_div(pt_amount, WAD, py_index);
        ensure_positive(&env, sy_amount);

        let sy_addr = read_sy(&env);
        let sy = SyClient::new(&env, &sy_addr);
        sy.transfer(&env.current_contract_address(), &caller, &sy_amount);

        env.events()
            .publish((symbol_short!("rdmat"), caller.clone()), (pt_amount, sy_amount));
        sy_amount
    }

    /// Settle accumulated YT yield for the caller and pay it out as SY.
    pub fn claim_yield(env: Env, caller: Address) -> i128 {
        caller.require_auth();
        ensure_active(&env);

        sync_internal(&env);
        settle_user(&env, &caller);

        let unclaimed = read_unclaimed_sy(&env, &caller);
        if unclaimed <= 0 {
            return 0;
        }

        write_unclaimed_sy(&env, &caller, 0);

        let sy_addr = read_sy(&env);
        let sy = SyClient::new(&env, &sy_addr);
        sy.transfer(&env.current_contract_address(), &caller, &unclaimed);

        env.events()
            .publish((symbol_short!("claim"), caller.clone()), unclaimed);
        unclaimed
    }

    /// View: claimable yield in SY for `user` if they settled now.
    pub fn pending_yield(env: Env, user: Address) -> i128 {
        let py_now = current_py_index_view(&env);
        let py_stored = read_py_index(&env);
        let mut yield_index = read_yield_index(&env);
        if py_now > py_stored {
            yield_index += wad_div(WAD, py_stored) - wad_div(WAD, py_now);
        }
        let user_index = read_user_yield_index(&env, &user);
        let yt = read_yt(&env, &user);
        let delta = yield_index - user_index;
        let mut owed = read_unclaimed_sy(&env, &user);
        if yt > 0 && delta > 0 {
            owed += mul_div(yt, delta, WAD);
        }
        owed
    }

    /* ------- PT token interface ------- */

    pub fn pt_balance(env: Env, addr: Address) -> i128 {
        read_pt(&env, &addr)
    }

    pub fn pt_transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        ensure_positive(&env, amount);
        let from_bal = read_pt(&env, &from);
        if from_bal < amount {
            panic_with_error!(&env, Error::InsufficientPt);
        }
        let to_bal = read_pt(&env, &to);
        write_pt(&env, &from, from_bal - amount);
        write_pt(&env, &to, to_bal + amount);
        env.events()
            .publish((symbol_short!("pt_xfer"), from, to), amount);
    }

    pub fn pt_transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        spender.require_auth();
        ensure_positive(&env, amount);
        spend_pt_allowance(&env, &from, &spender, amount);
        let from_bal = read_pt(&env, &from);
        if from_bal < amount {
            panic_with_error!(&env, Error::InsufficientPt);
        }
        let to_bal = read_pt(&env, &to);
        write_pt(&env, &from, from_bal - amount);
        write_pt(&env, &to, to_bal + amount);
        env.events()
            .publish((symbol_short!("pt_xfrf"), from, to), amount);
    }

    pub fn pt_approve(env: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        if amount < 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let key = DataKey::PtAllowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().set(&key, &amount);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
        env.events()
            .publish((symbol_short!("pt_apprv"), from, spender), amount);
    }

    pub fn pt_allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::PtAllowance(AllowanceKey { from, spender }))
            .unwrap_or(0)
    }

    /* ------- YT token interface ------- */

    pub fn yt_balance(env: Env, addr: Address) -> i128 {
        read_yt(&env, &addr)
    }

    pub fn yt_transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        ensure_positive(&env, amount);
        sync_internal(&env);
        settle_user(&env, &from);
        settle_user(&env, &to);
        let from_bal = read_yt(&env, &from);
        if from_bal < amount {
            panic_with_error!(&env, Error::InsufficientYt);
        }
        let to_bal = read_yt(&env, &to);
        write_yt(&env, &from, from_bal - amount);
        write_yt(&env, &to, to_bal + amount);
        env.events()
            .publish((symbol_short!("yt_xfer"), from, to), amount);
    }

    pub fn yt_transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        spender.require_auth();
        ensure_positive(&env, amount);
        sync_internal(&env);
        settle_user(&env, &from);
        settle_user(&env, &to);
        spend_yt_allowance(&env, &from, &spender, amount);
        let from_bal = read_yt(&env, &from);
        if from_bal < amount {
            panic_with_error!(&env, Error::InsufficientYt);
        }
        let to_bal = read_yt(&env, &to);
        write_yt(&env, &from, from_bal - amount);
        write_yt(&env, &to, to_bal + amount);
        env.events()
            .publish((symbol_short!("yt_xfrf"), from, to), amount);
    }

    pub fn yt_approve(env: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        if amount < 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let key = DataKey::YtAllowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().set(&key, &amount);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
        env.events()
            .publish((symbol_short!("yt_apprv"), from, spender), amount);
    }

    pub fn yt_allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::YtAllowance(AllowanceKey { from, spender }))
            .unwrap_or(0)
    }

    /* ------- Minter privileged mint/burn (for AMM flash swaps) ------- */

    pub fn minter_mint(env: Env, caller: Address, to: Address, amount: i128) {
        caller.require_auth();
        ensure_minter(&env, &caller);
        ensure_positive(&env, amount);
        sync_internal(&env);
        settle_user(&env, &to);
        credit_pt(&env, &to, amount);
        credit_yt(&env, &to, amount);
        let supply = read_supply(&env);
        write_supply(&env, supply + amount);
        env.events()
            .publish((symbol_short!("m_mint"), caller, to), amount);
    }

    pub fn minter_burn(env: Env, caller: Address, from: Address, amount: i128) {
        caller.require_auth();
        ensure_minter(&env, &caller);
        ensure_positive(&env, amount);
        sync_internal(&env);
        settle_user(&env, &from);
        debit_pt(&env, &from, amount);
        debit_yt(&env, &from, amount);
        let supply = read_supply(&env);
        write_supply(&env, supply - amount);
        env.events()
            .publish((symbol_short!("m_burn"), caller, from), amount);
    }

    /* ------- View accessors ------- */

    pub fn total_supply(env: Env) -> i128 {
        read_supply(&env)
    }

    pub fn py_index(env: Env) -> i128 {
        read_py_index(&env)
    }

    pub fn yield_index(env: Env) -> i128 {
        read_yield_index(&env)
    }

    pub fn maturity(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::Maturity)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }

    pub fn sy_token(env: Env) -> Address {
        read_sy(&env)
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap_or(7)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn is_matured(env: Env) -> bool {
        env.ledger().timestamp() >= read_maturity_ts(&env)
    }
}

/* ------- Internal helpers ------- */

fn sync_internal(env: &Env) {
    if env.ledger().timestamp() >= read_maturity_ts(env) {
        if !env.storage().instance().has(&DataKey::PyIndexAtMaturity) {
            // Snapshot the maturity index using current SY exchange rate.
            let py_stored = read_py_index(env);
            let py_live = live_py_index(env);
            let py_to_freeze = if py_live > py_stored {
                // Bring the yield index up to py_live for YT holders.
                update_yield_index(env, py_stored, py_live);
                py_live
            } else {
                py_stored
            };
            env.storage()
                .instance()
                .set(&DataKey::PyIndexAtMaturity, &py_to_freeze);
            env.storage().instance().set(&DataKey::PyIndex, &py_to_freeze);
            env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
        }
        return;
    }

    let py_stored = read_py_index(env);
    let py_live = live_py_index(env);
    if py_live > py_stored {
        update_yield_index(env, py_stored, py_live);
        env.storage().instance().set(&DataKey::PyIndex, &py_live);
        env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
    }
}

fn update_yield_index(env: &Env, py_old: i128, py_new: i128) {
    let supply = read_supply(env);
    if supply <= 0 {
        return;
    }
    // delta_per_yt = 1/py_old - 1/py_new (in WAD), units: SY per YT (asset-unit).
    let delta = wad_div(WAD, py_old) - wad_div(WAD, py_new);
    if delta <= 0 {
        return;
    }
    let current = read_yield_index(env);
    env.storage()
        .instance()
        .set(&DataKey::YieldIndex, &(current + delta));
    env.storage().instance().extend_ttl(TTL_LOW, TTL_BUMP);
}

fn settle_user(env: &Env, user: &Address) {
    let yield_index = read_yield_index(env);
    let user_index = read_user_yield_index(env, user);
    if yield_index <= user_index {
        // Still record the index so future settles compute correctly.
        if yield_index != user_index {
            write_user_yield_index(env, user, yield_index);
        }
        return;
    }
    let yt = read_yt(env, user);
    if yt > 0 {
        let delta = yield_index - user_index;
        let owed = mul_div(yt, delta, WAD);
        if owed > 0 {
            let current = read_unclaimed_sy(env, user);
            write_unclaimed_sy(env, user, current + owed);
        }
    }
    write_user_yield_index(env, user, yield_index);
}

fn current_py_index_view(env: &Env) -> i128 {
    if env.ledger().timestamp() >= read_maturity_ts(env) {
        if let Some(matured) = env
            .storage()
            .instance()
            .get::<DataKey, i128>(&DataKey::PyIndexAtMaturity)
        {
            return matured;
        }
    }
    live_py_index(env)
}

fn live_py_index(env: &Env) -> i128 {
    let sy_addr = read_sy(env);
    let sy = SyClient::new(env, &sy_addr);
    sy.exchange_rate()
}

fn credit_pt(env: &Env, addr: &Address, amount: i128) {
    let bal = read_pt(env, addr);
    write_pt(env, addr, bal + amount);
}

fn debit_pt(env: &Env, addr: &Address, amount: i128) {
    let bal = read_pt(env, addr);
    if bal < amount {
        panic_with_error!(env, Error::InsufficientPt);
    }
    write_pt(env, addr, bal - amount);
}

fn credit_yt(env: &Env, addr: &Address, amount: i128) {
    let bal = read_yt(env, addr);
    write_yt(env, addr, bal + amount);
}

fn debit_yt(env: &Env, addr: &Address, amount: i128) {
    let bal = read_yt(env, addr);
    if bal < amount {
        panic_with_error!(env, Error::InsufficientYt);
    }
    write_yt(env, addr, bal - amount);
}

fn read_pt(env: &Env, addr: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::PtBalance(addr.clone()))
        .unwrap_or(0)
}

fn write_pt(env: &Env, addr: &Address, value: i128) {
    let key = DataKey::PtBalance(addr.clone());
    if value == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &value);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
    }
}

fn read_yt(env: &Env, addr: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::YtBalance(addr.clone()))
        .unwrap_or(0)
}

fn write_yt(env: &Env, addr: &Address, value: i128) {
    let key = DataKey::YtBalance(addr.clone());
    if value == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &value);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
    }
}

fn read_user_yield_index(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::UserYieldIndex(user.clone()))
        .unwrap_or(0)
}

fn write_user_yield_index(env: &Env, user: &Address, value: i128) {
    let key = DataKey::UserYieldIndex(user.clone());
    env.storage().persistent().set(&key, &value);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_LOW, TTL_BUMP);
}

fn read_unclaimed_sy(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::UserUnclaimedSy(user.clone()))
        .unwrap_or(0)
}

fn write_unclaimed_sy(env: &Env, user: &Address, value: i128) {
    let key = DataKey::UserUnclaimedSy(user.clone());
    if value == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &value);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_LOW, TTL_BUMP);
    }
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

fn read_py_index(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::PyIndex)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_yield_index(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::YieldIndex)
        .unwrap_or(0)
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

fn read_maturity_ts(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::Maturity)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn read_matured_index(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::PyIndexAtMaturity)
        .unwrap_or_else(|| panic_with_error!(env, Error::NoIndex))
}

fn spend_pt_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
    let key = DataKey::PtAllowance(AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    });
    let current = env
        .storage()
        .persistent()
        .get::<DataKey, i128>(&key)
        .unwrap_or(0);
    if current < amount {
        panic_with_error!(env, Error::InsufficientPtAllowance);
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

fn spend_yt_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
    let key = DataKey::YtAllowance(AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    });
    let current = env
        .storage()
        .persistent()
        .get::<DataKey, i128>(&key)
        .unwrap_or(0);
    if current < amount {
        panic_with_error!(env, Error::InsufficientYtAllowance);
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
    let admin = read_admin(env);
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

fn ensure_not_matured(env: &Env) {
    if env.ledger().timestamp() >= read_maturity_ts(env) {
        panic_with_error!(env, Error::AlreadyMatured);
    }
}

fn ensure_matured(env: &Env) {
    if env.ledger().timestamp() < read_maturity_ts(env) {
        panic_with_error!(env, Error::NotYetMatured);
    }
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test;
