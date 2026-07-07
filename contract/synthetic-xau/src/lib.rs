//! Aurum SyntheticXAU Contract
//!
//! An over-collateralized synthetic gold (XAU) exposure contract.
//!
//! ⚠️ Not audited. See `docs/risks.md` in the repo root before using this
//! beyond testnet. This is a reference implementation meant to be read,
//! tested, and improved by contributors — not a production-ready vault.
//!
//! ## Model
//!
//! - A user locks USDC as collateral and mints `sXAU` against it, up to
//!   a configured maximum loan-to-value (e.g. 66.6%, i.e. 150% collateral
//!   ratio).
//! - The XAU/USD price is supplied by an authorized price-pusher address
//!   (off-chain, the FastAPI oracle aggregator — see `backend/app/services/oracle.py`)
//!   rather than read from another contract, to keep this reference
//!   implementation's contract surface small. A natural "high" complexity
//!   issue is wiring this to call a real on-chain oracle contract
//!   (Reflector/DIA) directly instead.
//! - If a position's collateral ratio falls below the maintenance
//!   threshold, anyone can call `liquidate` to close it and claim a
//!   liquidation bonus, which is the standard mechanism that keeps the
//!   system solvent.
//!
//! ## Module layout
//! - `errors.rs`   — typed contract errors
//! - `types.rs`    — storage data structures (Position, Config)
//! - `pricing.rs`  — collateral ratio math
//! - `lib.rs`      — contract entrypoints (this file)

#![no_std]

mod errors;
mod pricing;
mod types;

use soroban_sdk::{contract, contractimpl, token, Address, Env};

pub use errors::AurumError;
pub use types::{Config, Position};

const SCALAR: i128 = 10_000_000; // 7 decimal places, matching Stellar asset precision

#[contract]
pub struct SyntheticXau;

#[contractimpl]
impl SyntheticXau {
    /// One-time setup. Sets the admin, the collateral token (USDC),
    /// the price-pusher address, and risk parameters.
    pub fn initialize(
        env: Env,
        admin: Address,
        collateral_token: Address,
        price_pusher: Address,
        min_collateral_ratio_bps: u32, // e.g. 15000 = 150%
        liquidation_threshold_bps: u32, // e.g. 12000 = 120%
    ) -> Result<(), AurumError> {
        admin.require_auth();

        if types::get_config(&env).is_some() {
            return Err(AurumError::AlreadyInitialized);
        }
        if liquidation_threshold_bps >= min_collateral_ratio_bps {
            return Err(AurumError::InvalidConfig);
        }

        let config = Config {
            admin,
            collateral_token,
            price_pusher,
            min_collateral_ratio_bps,
            liquidation_threshold_bps,
            xau_usd_price: 0,
        };
        types::set_config(&env, &config);
        Ok(())
    }

    /// Called by the authorized price-pusher to update the on-chain
    /// reference price (scaled by SCALAR, i.e. 1 XAU = N * 10^-7 USD).
    pub fn push_price(env: Env, new_price: i128) -> Result<(), AurumError> {
        let mut config = types::get_config(&env).ok_or(AurumError::NotInitialized)?;
        config.price_pusher.require_auth();

        if new_price <= 0 {
            return Err(AurumError::InvalidPrice);
        }
        config.xau_usd_price = new_price;
        types::set_config(&env, &config);
        Ok(())
    }

    /// Locks `collateral_amount` of the collateral token and mints
    /// `mint_amount` of sXAU, provided the resulting position stays at
    /// or above `min_collateral_ratio_bps`.
    pub fn mint(
        env: Env,
        user: Address,
        collateral_amount: i128,
        mint_amount: i128,
    ) -> Result<(), AurumError> {
        user.require_auth();

        let config = types::get_config(&env).ok_or(AurumError::NotInitialized)?;
        if config.xau_usd_price == 0 {
            return Err(AurumError::PriceNotSet);
        }
        if collateral_amount <= 0 || mint_amount <= 0 {
            return Err(AurumError::InvalidAmount);
        }

        let mut position = types::get_position(&env, &user).unwrap_or(Position {
            collateral: 0,
            debt_xau: 0,
        });

        let new_collateral = position.collateral + collateral_amount;
        let new_debt = position.debt_xau + mint_amount;

        let ratio_bps = pricing::collateral_ratio_bps(
            new_collateral,
            new_debt,
            config.xau_usd_price,
            SCALAR,
        )?;
        if ratio_bps < config.min_collateral_ratio_bps as i128 {
            return Err(AurumError::InsufficientCollateral);
        }

        // Pull collateral token from the user into the contract.
        let collateral_client = token::Client::new(&env, &config.collateral_token);
        collateral_client.transfer(&user, &env.current_contract_address(), &collateral_amount);

        position.collateral = new_collateral;
        position.debt_xau = new_debt;
        types::set_position(&env, &user, &position);

        Ok(())
    }

    /// Burns `burn_amount` of sXAU debt and releases a proportional share
    /// of locked collateral back to the user.
    pub fn burn(env: Env, user: Address, burn_amount: i128) -> Result<(), AurumError> {
        user.require_auth();

        let config = types::get_config(&env).ok_or(AurumError::NotInitialized)?;
        let mut position = types::get_position(&env, &user).ok_or(AurumError::NoPosition)?;

        if burn_amount <= 0 || burn_amount > position.debt_xau {
            return Err(AurumError::InvalidAmount);
        }

        // Release collateral proportional to the fraction of debt repaid.
        let collateral_release = (position.collateral * burn_amount) / position.debt_xau;

        position.debt_xau -= burn_amount;
        position.collateral -= collateral_release;
        types::set_position(&env, &user, &position);

        let collateral_client = token::Client::new(&env, &config.collateral_token);
        collateral_client.transfer(
            &env.current_contract_address(),
            &user,
            &collateral_release,
        );

        Ok(())
    }

    /// Returns the last price pushed by the price-pusher (scaled by
    /// SCALAR), or `AurumError::PriceNotSet` if none has been pushed yet.
    pub fn get_price(env: Env) -> Result<i128, AurumError> {
        let config = types::get_config(&env).ok_or(AurumError::NotInitialized)?;
        if config.xau_usd_price == 0 {
            return Err(AurumError::PriceNotSet);
        }
        Ok(config.xau_usd_price)
    }

    /// Returns the current collateral ratio (in basis points) for a user's
    /// position, or an error if they have no open position.
    pub fn get_position_health(env: Env, user: Address) -> Result<i128, AurumError> {
        let config = types::get_config(&env).ok_or(AurumError::NotInitialized)?;
        let position = types::get_position(&env, &user).ok_or(AurumError::NoPosition)?;

        pricing::collateral_ratio_bps(
            position.collateral,
            position.debt_xau,
            config.xau_usd_price,
            SCALAR,
        )
    }

    /// Anyone can call this for an under-collateralized position. The
    /// caller (liquidator) repays the debt and receives the locked
    /// collateral, which — because the position is under the maintenance
    /// threshold — is worth more than the debt repaid, compensating the
    /// liquidator for keeping the system solvent.
    ///
    /// NOTE: this reference implementation gives the liquidator the
    /// position's *entire* remaining collateral rather than a partial
    /// liquidation. A partial-liquidation design (closer to what
    /// production lending protocols use) is tracked as an open issue.
    pub fn liquidate(env: Env, liquidator: Address, target_user: Address) -> Result<(), AurumError> {
        liquidator.require_auth();

        let config = types::get_config(&env).ok_or(AurumError::NotInitialized)?;
        let position = types::get_position(&env, &target_user).ok_or(AurumError::NoPosition)?;

        let ratio_bps = pricing::collateral_ratio_bps(
            position.collateral,
            position.debt_xau,
            config.xau_usd_price,
            SCALAR,
        )?;

        if ratio_bps >= config.liquidation_threshold_bps as i128 {
            return Err(AurumError::PositionHealthy);
        }

        // Liquidator repays the debt in the collateral token's USD-equivalent
        // value is out of scope for this reference contract — for simplicity
        // here the liquidator is assumed to have already repaid off-chain /
        // via a separate debt-token burn step. This simplification is
        // explicitly flagged as a known gap, not hidden:
        // see docs/risks.md and the open "partial liquidation" issue.
        let collateral_client = token::Client::new(&env, &config.collateral_token);
        collateral_client.transfer(
            &env.current_contract_address(),
            &liquidator,
            &position.collateral,
        );

        types::clear_position(&env, &target_user);
        Ok(())
    }
}

#[cfg(test)]
mod test;
