#![no_std]

mod types;

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, panic_with_error, symbol_short, token,
    Address, Env,
};

pub use types::{DataKey, FixedDepositResult, RateInfo};

pub const TTL_LOW: u32 = 17_280;
pub const TTL_BUMP: u32 = 535_680;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
}

#[contractclient(name = "SyClient")]
pub trait SyTokenInterface {
    fn deposit(env: Env, from: Address, amount: i128) -> i128;
    fn redeem(env: Env, from: Address, sy_amount: i128) -> i128;
    fn underlying(env: Env) -> Address;
    fn balance(env: Env, address: Address) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
}

#[contractclient(name = "SplitterClient")]
pub trait SplitterInterface {
    fn mint(env: Env, caller: Address, sy_amount: i128) -> (i128, i128);
    fn redeem_at_maturity(env: Env, caller: Address, pt_amount: i128) -> i128;
    fn claim_yield(env: Env, caller: Address) -> i128;
    fn pt_transfer(env: Env, from: Address, to: Address, amount: i128);
    fn yt_approve(env: Env, from: Address, spender: Address, amount: i128);
    fn sy_token(env: Env) -> Address;
}

#[contractclient(name = "MarketClient")]
pub trait MarketInterface {
    fn swap_exact_yt_for_sy(env: Env, caller: Address, yt_in: i128, min_sy_out: i128) -> i128;
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

    /// Composes the full Fixed Savings deposit:
    ///   underlying → SY → (PT + YT) → sell YT for SY → SY → underlying yield
    ///
    /// The user ends up holding `pt_minted` PT (redeemable at maturity for the
    /// underlying principal) and immediately receives `yield_underlying` of
    /// the underlying token as the locked-in fixed yield.
    pub fn deposit_for_fixed_rate(
        env: Env,
        user: Address,
        market: Address,
        amount: i128,
        min_yield_sy: i128,
    ) -> FixedDepositResult {
        user.require_auth();
        ensure_positive(&env, amount);

        let market_client = MarketClient::new(&env, &market);
        let sy_addr = market_client.sy_token();
        let splitter_addr = market_client.splitter_address();
        let maturity = market_client.maturity();

        let sy = SyClient::new(&env, &sy_addr);
        let splitter = SplitterClient::new(&env, &splitter_addr);
        let underlying = sy.underlying();

        let router = env.current_contract_address();

        // 1. Pull underlying from user → router.
        token::Client::new(&env, &underlying).transfer(&user, &router, &amount);

        // 2. Deposit underlying → SY (held by router).
        let sy_minted = sy.deposit(&router, &amount);

        // 3. Split SY → equal PT + YT (held by router).
        let (pt_amount, yt_amount) = splitter.mint(&router, &sy_minted);

        // 4. Approve market to pull YT from router.
        splitter.yt_approve(&router, &market, &yt_amount);

        // 5. Sell YT for SY (the upfront fixed-yield).
        let yield_sy = market_client.swap_exact_yt_for_sy(&router, &yt_amount, &min_yield_sy);

        // 6. Convert yield SY → underlying.
        let yield_underlying = sy.redeem(&router, &yield_sy);

        // 7. Transfer PT (the principal claim) to the user.
        splitter.pt_transfer(&router, &user, &pt_amount);

        // 8. Transfer the upfront yield to the user.
        token::Client::new(&env, &underlying).transfer(&router, &user, &yield_underlying);

        env.events().publish(
            (symbol_short!("dep_fixed"), user.clone()),
            (amount, pt_amount, yield_underlying, maturity),
        );

        FixedDepositResult {
            pt_minted: pt_amount,
            yield_underlying,
            maturity,
        }
    }

    /// Flex Savings deposit: underlying → SY (held by user).
    pub fn deposit_for_flex(env: Env, user: Address, sy_token: Address, amount: i128) -> i128 {
        user.require_auth();
        ensure_positive(&env, amount);

        let sy = SyClient::new(&env, &sy_token);
        let underlying = sy.underlying();
        let router = env.current_contract_address();

        token::Client::new(&env, &underlying).transfer(&user, &router, &amount);
        let sy_minted = sy.deposit(&router, &amount);
        sy.transfer(&router, &user, &sy_minted);

        env.events()
            .publish((symbol_short!("dep_flex"), user.clone()), (amount, sy_minted));
        sy_minted
    }

    /// Flex Savings withdraw: SY → underlying back to user.
    pub fn withdraw_flex(env: Env, user: Address, sy_token: Address, sy_amount: i128) -> i128 {
        user.require_auth();
        ensure_positive(&env, sy_amount);

        let sy = SyClient::new(&env, &sy_token);
        let underlying = sy.underlying();
        let router = env.current_contract_address();

        // Pull SY from user → router.
        sy.transfer(&user, &router, &sy_amount);
        // Redeem SY → underlying to router.
        let returned = sy.redeem(&router, &sy_amount);
        // Forward underlying to user.
        token::Client::new(&env, &underlying).transfer(&router, &user, &returned);

        env.events().publish(
            (symbol_short!("wd_flex"), user.clone()),
            (sy_amount, returned),
        );
        returned
    }

    /// After maturity, redeem PT → underlying.
    pub fn redeem_at_maturity(
        env: Env,
        user: Address,
        market: Address,
        pt_amount: i128,
    ) -> i128 {
        user.require_auth();
        ensure_positive(&env, pt_amount);

        let market_client = MarketClient::new(&env, &market);
        let sy_addr = market_client.sy_token();
        let splitter_addr = market_client.splitter_address();
        let sy = SyClient::new(&env, &sy_addr);
        let splitter = SplitterClient::new(&env, &splitter_addr);
        let underlying = sy.underlying();
        let router = env.current_contract_address();

        // Pull PT from user → router. The splitter's redeem_at_maturity requires
        // caller auth and burns from the caller, so we need PT in router's
        // balance. We use pt_transfer (user auth covers it through the user
        // authorization on this Router entrypoint).
        splitter.pt_transfer(&user, &router, &pt_amount);
        // Redeem PT → SY (router receives SY).
        let sy_returned = splitter.redeem_at_maturity(&router, &pt_amount);
        // Convert SY → underlying.
        let underlying_returned = sy.redeem(&router, &sy_returned);
        // Forward to user.
        token::Client::new(&env, &underlying).transfer(&router, &user, &underlying_returned);

        env.events().publish(
            (symbol_short!("mature"), user.clone()),
            (pt_amount, underlying_returned),
        );
        underlying_returned
    }

    /// Sweep accumulated YT yield → underlying back to user.
    pub fn claim_yield(env: Env, user: Address, market: Address) -> i128 {
        user.require_auth();
        let market_client = MarketClient::new(&env, &market);
        let splitter_addr = market_client.splitter_address();
        let sy_addr = market_client.sy_token();
        let splitter = SplitterClient::new(&env, &splitter_addr);
        let sy = SyClient::new(&env, &sy_addr);
        let underlying = sy.underlying();
        let router = env.current_contract_address();

        // claim_yield sends SY to the caller. We want SY at the router first
        // so we can convert it. Switch: user claims directly to themselves,
        // then this Router only redeems on their behalf. Implement that flow:
        let sy_received = splitter.claim_yield(&user);
        if sy_received <= 0 {
            return 0;
        }
        // User now holds SY. Have them transfer it through router → redeem → forward.
        sy.transfer(&user, &router, &sy_received);
        let underlying_returned = sy.redeem(&router, &sy_received);
        token::Client::new(&env, &underlying).transfer(&router, &user, &underlying_returned);

        env.events().publish(
            (symbol_short!("claim"), user.clone()),
            underlying_returned,
        );
        underlying_returned
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

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test;
