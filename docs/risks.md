# Risk Disclosure

Aurum is a research/educational open-source project. Before using it beyond testnet, understand:

- **No audit.** The `SyntheticXAU` contract has not been professionally audited. Do not deploy it to mainnet with real value at stake without a security audit (see [Veridise](https://veridise.com/audits/soroban/) or similar Soroban-focused auditors).
- **Oracle risk.** The protocol's price comes from aggregating Reflector and DIA feeds. Oracle manipulation, staleness, or divergence from real spot price is a real risk for any synthetic asset protocol, on any chain.
- **Liquidation risk.** Positions below the maintenance collateral ratio are subject to liquidation. The liquidation mechanism in this repo is a reference implementation and has known simplifications — see open issues.
- **No peg guarantee.** Nothing in this contract guarantees the synthetic token trades at real XAU spot price. It is collateral-backed, not custodied gold.
- **This is not financial advice and not an offer to sell securities or commodities derivatives.** Aurum is software; how it's used is the user's responsibility and subject to applicable law in their jurisdiction.

If you are building on top of Aurum for a production use case, start a discussion in [GitHub Discussions](../../discussions) before assuming any guarantee about its behavior.
