#![cfg(test)]

use crate::{AurumError, SyntheticXau, SyntheticXauClient};
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

const SCALAR: i128 = 10_000_000;
const MIN_RATIO_BPS: u32 = 15_000; // 150%
const LIQ_THRESHOLD_BPS: u32 = 12_000; // 120%

struct TestSetup {
    env: Env,
    client: SyntheticXauClient<'static>,
    admin: Address,
    price_pusher: Address,
    collateral_token: Address,
    collateral_admin_client: StellarAssetClient<'static>,
    collateral_client: TokenClient<'static>,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let price_pusher = Address::generate(&env);

    // Deploy a mock USDC-like Stellar Asset Contract to use as collateral.
    let collateral_token_admin = Address::generate(&env);
    let collateral_contract_id = env
        .register_stellar_asset_contract_v2(collateral_token_admin.clone())
        .address();
    let collateral_admin_client = StellarAssetClient::new(&env, &collateral_contract_id);
    let collateral_client = TokenClient::new(&env, &collateral_contract_id);

    let contract_id = env.register(SyntheticXau, ());
    let client = SyntheticXauClient::new(&env, &contract_id);

    client.initialize(
        &admin,
        &collateral_contract_id,
        &price_pusher,
        &MIN_RATIO_BPS,
        &LIQ_THRESHOLD_BPS,
    );

    TestSetup {
        env,
        client,
        admin,
        price_pusher,
        collateral_token: collateral_contract_id,
        collateral_admin_client,
        collateral_client,
    }
}

#[test]
fn initialize_rejects_invalid_threshold_ordering() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let price_pusher = Address::generate(&env);
    let collateral_admin = Address::generate(&env);
    let collateral_token = env
        .register_stellar_asset_contract_v2(collateral_admin)
        .address();

    let contract_id = env.register(SyntheticXau, ());
    let client = SyntheticXauClient::new(&env, &contract_id);

    // liquidation threshold >= min ratio should be rejected.
    let result = client.try_initialize(&admin, &collateral_token, &price_pusher, &12_000, &15_000);
    assert_eq!(result, Err(Ok(AurumError::InvalidConfig)));
}

#[test]
fn push_price_updates_state() {
    let setup = setup();
    setup.client.push_price(&(2_000 * SCALAR));
    // No direct getter for price in the public API yet (tracked as a
    // good-first-issue: add `get_price`), so we confirm indirectly via
    // a mint that depends on it succeeding.
    let user = Address::generate(&setup.env);
    setup
        .collateral_admin_client
        .mint(&user, &(3_000 * SCALAR));

    setup.client.mint(&user, &(3_000 * SCALAR), &(1 * SCALAR));
    let health = setup.client.get_position_health(&user);
    assert_eq!(health, 15_000);
}

#[test]
fn mint_succeeds_at_exactly_minimum_ratio() {
    let setup = setup();
    setup.client.push_price(&(2_000 * SCALAR));

    let user = Address::generate(&setup.env);
    setup
        .collateral_admin_client
        .mint(&user, &(3_000 * SCALAR));

    setup.client.mint(&user, &(3_000 * SCALAR), &(1 * SCALAR));

    let health = setup.client.get_position_health(&user);
    assert_eq!(health, MIN_RATIO_BPS as i128);

    // Collateral should have moved from user to the contract.
    assert_eq!(setup.collateral_client.balance(&user), 0);
}

#[test]
fn mint_rejected_when_undercollateralized() {
    let setup = setup();
    setup.client.push_price(&(2_000 * SCALAR));

    let user = Address::generate(&setup.env);
    setup
        .collateral_admin_client
        .mint(&user, &(2_000 * SCALAR));

    // Only $2000 collateral for 1 XAU ($2000 debt) = 100% ratio, below
    // the 150% minimum.
    let result = setup
        .client
        .try_mint(&user, &(2_000 * SCALAR), &(1 * SCALAR));
    assert_eq!(result, Err(Ok(AurumError::InsufficientCollateral)));
}

#[test]
fn burn_releases_proportional_collateral() {
    let setup = setup();
    setup.client.push_price(&(2_000 * SCALAR));

    let user = Address::generate(&setup.env);
    setup
        .collateral_admin_client
        .mint(&user, &(3_000 * SCALAR));
    setup.client.mint(&user, &(3_000 * SCALAR), &(1 * SCALAR));

    // Burn half the debt -> should release half the collateral.
    setup.client.burn(&user, &(SCALAR / 2));

    assert_eq!(setup.collateral_client.balance(&user), 1_500 * SCALAR);
}

#[test]
fn liquidate_fails_on_healthy_position() {
    let setup = setup();
    setup.client.push_price(&(2_000 * SCALAR));

    let user = Address::generate(&setup.env);
    setup
        .collateral_admin_client
        .mint(&user, &(3_000 * SCALAR));
    setup.client.mint(&user, &(3_000 * SCALAR), &(1 * SCALAR));

    let liquidator = Address::generate(&setup.env);
    let result = setup.client.try_liquidate(&liquidator, &user);
    assert_eq!(result, Err(Ok(AurumError::PositionHealthy)));
}

#[test]
fn liquidate_succeeds_once_price_drop_breaches_threshold() {
    let setup = setup();
    setup.client.push_price(&(2_000 * SCALAR));

    let user = Address::generate(&setup.env);
    setup
        .collateral_admin_client
        .mint(&user, &(3_000 * SCALAR));
    setup.client.mint(&user, &(3_000 * SCALAR), &(1 * SCALAR));

    // Gold price spikes from $2000 to $2600 -> debt value rises to
    // $2600, collateral stays at $3000 -> ratio drops to ~115%, below
    // the 120% liquidation threshold.
    setup.client.push_price(&(2_600 * SCALAR));

    let health = setup.client.get_position_health(&user);
    assert!(health < LIQ_THRESHOLD_BPS as i128);

    let liquidator = Address::generate(&setup.env);
    setup.client.liquidate(&liquidator, &user);

    assert_eq!(setup.collateral_client.balance(&liquidator), 3_000 * SCALAR);

    // Position should be cleared after liquidation.
    let result = setup.client.try_get_position_health(&user);
    assert_eq!(result, Err(Ok(AurumError::NoPosition)));
}
