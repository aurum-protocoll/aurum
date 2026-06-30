//! Collateral ratio math, isolated from contract entrypoints so it can
//! be unit tested directly without spinning up a full contract env.
//!
//! Collateral ratio (in basis points) is defined as:
//!
//!     ratio_bps = (collateral_value_usd / debt_value_usd) * 10_000
//!
//! where `debt_value_usd = debt_xau * xau_usd_price / SCALAR`, and
//! `collateral_value_usd` is just `collateral` (since the collateral
//! token is USDC, a USD-pegged stablecoin, in this reference design —
//! see the open issue tracking multi-collateral support for other
//! assets, which would need a separate USD price feed per collateral
//! type).

use crate::errors::AurumError;

const BPS_SCALAR: i128 = 10_000;

/// Computes the collateral ratio in basis points for a position.
///
/// Returns `AurumError::DivisionByZero` if `debt_xau` is zero — a
/// position with collateral but no debt is treated as "infinitely
/// healthy" by the caller rather than by this function returning a
/// sentinel value, to keep the error explicit at the call site.
pub fn collateral_ratio_bps(
    collateral: i128,
    debt_xau: i128,
    xau_usd_price: i128,
    scalar: i128,
) -> Result<i128, AurumError> {
    if debt_xau == 0 {
        return Err(AurumError::DivisionByZero);
    }

    let debt_value_usd = (debt_xau * xau_usd_price) / scalar;
    if debt_value_usd == 0 {
        return Err(AurumError::DivisionByZero);
    }

    Ok((collateral * BPS_SCALAR) / debt_value_usd)
}

#[cfg(test)]
mod test {
    use super::*;

    const SCALAR: i128 = 10_000_000;

    #[test]
    fn ratio_at_exactly_150_percent() {
        // 1 XAU = $2000.0000000 (scaled). Mint 1 XAU of debt, lock $3000
        // of collateral -> 150% ratio.
        let xau_price = 2_000 * SCALAR;
        let debt_xau = 1 * SCALAR;
        let collateral = 3_000 * SCALAR;

        let ratio = collateral_ratio_bps(collateral, debt_xau, xau_price, SCALAR).unwrap();
        assert_eq!(ratio, 15_000); // 150.00%
    }

    #[test]
    fn ratio_below_maintenance_threshold() {
        let xau_price = 2_000 * SCALAR;
        let debt_xau = 1 * SCALAR;
        let collateral = 2_000 * SCALAR; // exactly 100% — clearly unsafe

        let ratio = collateral_ratio_bps(collateral, debt_xau, xau_price, SCALAR).unwrap();
        assert_eq!(ratio, 10_000); // 100.00%
    }

    #[test]
    fn zero_debt_returns_division_by_zero_error() {
        let result = collateral_ratio_bps(1_000 * SCALAR, 0, 2_000 * SCALAR, SCALAR);
        assert_eq!(result, Err(AurumError::DivisionByZero));
    }

    #[test]
    fn ratio_scales_correctly_with_price_change() {
        let debt_xau = 1 * SCALAR;
        let collateral = 3_000 * SCALAR;

        // Price drops from $2000 to $1500 -> ratio improves (less debt value).
        let ratio_at_2000 = collateral_ratio_bps(collateral, debt_xau, 2_000 * SCALAR, SCALAR).unwrap();
        let ratio_at_1500 = collateral_ratio_bps(collateral, debt_xau, 1_500 * SCALAR, SCALAR).unwrap();

        assert!(ratio_at_1500 > ratio_at_2000);
    }
}
