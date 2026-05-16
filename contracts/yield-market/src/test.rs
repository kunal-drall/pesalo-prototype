use super::*;
use soroban_sdk::Env;

#[test]
fn exposes_contract_version() {
    let env = Env::default();
    assert_eq!(
        YieldMarketContract::version(env.clone()),
        String::from_str(&env, "0.1.0")
    );
}
