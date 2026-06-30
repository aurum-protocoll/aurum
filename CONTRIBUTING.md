# Contributing to Aurum

Thanks for considering a contribution. Aurum is part of the Stellar open-source ecosystem and welcomes contributors of all experience levels.

## Ground rules

- Be respectful and constructive in issues, PRs, and reviews.
- Open an issue before starting non-trivial work, especially anything touching `contract/` — changes to mint/burn/liquidation logic need design discussion before code.
- Keep PRs focused — one logical change per PR.

## Workflow

1. **Fork** the repository and clone your fork.
2. **Create a branch** off `main`: `git checkout -b fix/short-description`.
3. **Make your change.** Follow existing code style:
   - Rust: `cargo fmt` and `cargo clippy` must pass.
   - Python: `ruff` and `black` must pass.
   - TypeScript: `eslint` and `prettier` must pass.
4. **Add or update tests** for any behavior change — this matters especially for `contract/`, where untested logic changes are a real financial risk, not just a style concern.
5. **Run tests locally:**
   ```bash
   cd contract && cargo test
   cd backend && pytest
   cd frontend && npm test
   ```
6. **Open a Pull Request** against `main`, referencing the issue number.
7. A maintainer will review and merge once it meets project standards.

## Picking an issue

- `good first issue` — scoped for newcomers.
- `help wanted` — open and unassigned, comment to claim.
- Issues touching `contract/` are generally `medium` or `high` complexity given the stakes of getting financial logic right — read carefully before picking one up.

## Reporting bugs / requesting features

Use the templates under `.github/ISSUE_TEMPLATE/`.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
