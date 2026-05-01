---
created: 2026-05-01
priority: medium
phase: 1
resolves_phase: 3
tags: [ops, github, security, deferred]
---

# Add `production` environment protection rules on GitHub

## Status
Deferred from Phase 1 plan 01-12 (T-12-destructive-migration-without-review threat).

GitHub `production` environment created at `repos/emoadm/smbsite/environments/production` but with NO protection rules — required-reviewers / wait-timer are not available on free GitHub plans for private repos.

## Why deferred
Phase 1 has no live user data — destructive-migration risk is theoretical. Gate becomes critical when Phase 3 voting goes live (real political-opinion data, GDPR Art. 9).

## How to resolve
Pick one before Phase 3 voting ships:

1. Upgrade to GitHub Pro (€4/month) → enable Required reviewers (`emoadm` + one teammate) + branch rule restricting deploys to `main`.
2. Make repo public (coalition decision; political-advocacy code).
3. Migrate repo to a GitHub organization on Team plan (more headroom for collaborators too).

After enabling, configure under https://github.com/emoadm/smbsite/settings/environments → `production`:
- Required reviewers: `emoadm` (+ another)
- Deployment branches: Selected → `main` only
- Wait timer: 0
