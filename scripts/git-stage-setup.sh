#!/usr/bin/env bash
# Staged commit setup for aurum-xau.
#
# Same philosophy as soroban-health's script: no backdated/faked
# timestamps (detectable and not the real fix). Run each STAGE as a
# separate block, ideally pushing and letting real time pass between
# stages rather than running this end-to-end in one sitting.

set -e

git init -b main

# Replace with your actual identity before running.
git config user.name "Chinedu Nwafor"
git config user.email "patrickchinwafor@gmail.com"

# ─────────────────────────────────────────────────────────────
# STAGE 1 — Project scaffolding & governance (Day 1)
# ─────────────────────────────────────────────────────────────
git add LICENSE CODE_OF_CONDUCT.md .gitignore
git commit -m "chore: add LICENSE, code of conduct, gitignore"

git add README.md docs/architecture.md docs/risks.md
git commit -m "docs: add project README, architecture overview, and risk disclosure"

git add CONTRIBUTING.md .github/
git commit -m "chore: add contributing guide, issue templates, CI workflow"

# ─────────────────────────────────────────────────────────────
# STAGE 2 — Contract (Day 1-2)
# ─────────────────────────────────────────────────────────────
git add contract/Cargo.toml contract/synthetic-xau/Cargo.toml
git commit -m "feat(contract): scaffold synthetic-xau contract crate"

git add contract/synthetic-xau/src/errors.rs
git commit -m "feat(contract): add typed error definitions"

git add contract/synthetic-xau/src/types.rs
git commit -m "feat(contract): add storage types for Config and Position"

git add contract/synthetic-xau/src/pricing.rs
git commit -m "feat(contract): add collateral ratio math with unit tests"

git add contract/synthetic-xau/src/lib.rs
git commit -m "feat(contract): implement mint, burn, liquidate entrypoints"

git add contract/synthetic-xau/src/test.rs
git commit -m "test(contract): add integration tests for mint/burn/liquidate flows"

git add contract/README.md
git commit -m "docs(contract): document contract layout, known gaps, and build steps"

# ─────────────────────────────────────────────────────────────
# STAGE 3 — Backend (Day 2-3)
# ─────────────────────────────────────────────────────────────
git add backend/requirements.txt backend/requirements-dev.txt backend/.env.example
git commit -m "chore(backend): add dependency manifests and env template"

git add backend/app/__init__.py backend/app/core/
git commit -m "feat(backend): add app config"

git add backend/app/models/
git commit -m "feat(backend): add Pydantic models for pricing and positions"

git add backend/app/services/__init__.py backend/app/services/sessions.py
git commit -m "feat(backend): add trading session detection and WAT conversion"

git add backend/tests/__init__.py backend/tests/test_sessions.py
git commit -m "test(backend): add session detection test suite"

git add backend/app/services/oracle.py
git commit -m "feat(backend): implement median price aggregation and spot reconciliation"

git add backend/tests/test_oracle.py
git commit -m "test(backend): add oracle aggregation test suite"

git add backend/app/api/
git commit -m "feat(backend): add pricing, positions, health API routes"

git add backend/app/main.py
git commit -m "feat(backend): wire up FastAPI app entrypoint"

git add backend/README.md
git commit -m "docs(backend): document API endpoints and local dev setup"

# ─────────────────────────────────────────────────────────────
# STAGE 4 — Frontend (Day 3-4)
# ─────────────────────────────────────────────────────────────
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/next.config.js \
        frontend/tailwind.config.js frontend/postcss.config.js \
        frontend/.eslintrc.json frontend/.env.example frontend/next-env.d.ts
git commit -m "chore(frontend): scaffold Next.js project config"

git add frontend/app/globals.css frontend/app/layout.tsx
git commit -m "feat(frontend): add root layout and global styles"

git add frontend/lib/
git commit -m "feat(frontend): add API client and shared types"

git add frontend/components/ReconciliationCard.tsx
git commit -m "feat(frontend): add price reconciliation card component"

git add frontend/components/PositionCard.tsx
git commit -m "feat(frontend): add position health card component"

git add frontend/app/page.tsx
git commit -m "feat(frontend): build synthetic XAU dashboard page"

# ─────────────────────────────────────────────────────────────
# STAGE 5 — Seed issues reference doc (Day 4, before opening real issues)
# ─────────────────────────────────────────────────────────────
git add docs/seed-issues.md
git commit -m "docs: add seed issue list for contributors"

echo ""
echo "Done. Run 'git log --oneline' to review, then:"
echo "  git remote add origin git@github.com:<org>/aurum.git"
echo "  git push -u origin main"
