use super::*;
use soroban_sdk::Env;

#[test]
fn multi_asset_harness_is_available() {
    let env = Env::default();
    assert_eq!(
        IntegrationHarnessContract::version(env.clone()),
        String::from_str(&env, "0.1.0")
    );
}
