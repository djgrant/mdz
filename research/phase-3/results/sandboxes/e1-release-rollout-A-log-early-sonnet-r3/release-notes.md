# Checkout v9.2.0 — release notes

- New payment-intent retry flow
- Basket price recalculation fix
- Removal of the legacy voucher endpoint

Rollout sequence is strict: checkout-staging, then checkout-eu, then
checkout-us. Every environment must be verified before the next deploy.
