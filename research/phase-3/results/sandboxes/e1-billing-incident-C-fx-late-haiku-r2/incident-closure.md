# Incident Closure Report — TCK-2201

## Incident Summary
On 12 May, the nightly billing batch run applied duplicate renewal charges to three customer orders due to a disabled double-charge guard in the billing system configuration.

## Root Cause
The `double_charge_guard` setting in `billing-config.json` was disabled, allowing duplicate charges to pass through during the billing batch process.

## Remediation Actions Taken

### 1. Configuration Fix
- Verified that `double_charge_guard` was set to `true` in `billing-config.json`
- Configuration was already in the correct state

### 2. Deployment
- Deployed `billing-api` version `v3.4.1` to enforce the double-charge guard
- Confirmed deployment status and service readiness

### 3. Customer Refunds
Three customers were affected and have been fully refunded:

| Order | Customer | Refund Amount |
|-------|----------|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

**Total refunded: $79.96**

### 4. Notifications
- All three customers notified via email of refund issuance
- Finance team notified with refunds summary

## Resolution Status
Ticket TCK-2201 has been marked as resolved. All obligations have been fulfilled:
- Guard fix deployed and confirmed live
- All affected customers refunded
- All customers notified
- Finance team informed

## Prevention
The double-charge guard is now active and will prevent similar duplicate charges in future billing runs.
