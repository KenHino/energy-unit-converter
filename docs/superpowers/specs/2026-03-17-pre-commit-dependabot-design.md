# Pre-commit and Dependabot Setup

**Date:** 2026-03-17
**Status:** Approved

## Overview

Add automated code-quality enforcement via pre-commit hooks and automated dependency update PRs via GitHub Dependabot to the energy-unit-converter project.

## Pre-commit Configuration

**Approach:** Local hooks (`repo: local`, `language: system`) that invoke the project's installed toolchain directly. No external hook repositories, no network dependencies at install time.

**File:** `.pre-commit-config.yaml` at the project root.

**Hooks (in order):**

| Hook | Command | Purpose |
|------|---------|---------|
| `cargo-fmt` | `cargo fmt --all -- --check` | Enforce consistent Rust formatting |
| `cargo-clippy` | `cargo clippy --all-targets -- -D warnings` | Catch Rust lints; warnings treated as errors |
| `cargo-test` | `cargo test` | Run full Rust test suite |
| `npm-test` | `cd www && npm test` | Run TypeScript/Vitest test suite |

All hooks are triggered on the `pre-commit` stage. The `pass_filenames` option is set to `false` for all hooks since none operate on individual files.

## Dependabot Configuration

**File:** `.github/dependabot.yml`

**Ecosystems:**

| Ecosystem | Directory | Schedule |
|-----------|-----------|----------|
| `cargo` | `/` | Weekly (Monday) |
| `npm` | `/www` | Weekly (Monday) |
| `github-actions` | `/` | Weekly (Monday) |

All three ecosystems use a weekly schedule to batch updates and reduce PR noise. GitHub Actions ecosystem keeps workflow action versions current (e.g., `actions/checkout`, `dtolnay/rust-toolchain`).

## Files to Create

1. `.pre-commit-config.yaml` — pre-commit hook definitions
2. `.github/dependabot.yml` — Dependabot configuration

## Out of Scope

- Pre-push hooks (tests are covered at pre-commit)
- Auto-merging Dependabot PRs
- Pinning specific Dependabot reviewers or labels
