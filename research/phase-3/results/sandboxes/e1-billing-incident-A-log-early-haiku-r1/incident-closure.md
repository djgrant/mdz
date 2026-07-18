# Incident Closure — TCK-2201

## Summary
Billing incident caused by disabled double-charge guard in billing-api has been fully remediated.

## Root Cause
The double_charge_guard configuration was disabled, causing the 12 May nightly billing batch run to apply renewal charges twice to a subset of orders.

## Remediation Actions Taken

1. **Configuration Verification**: Confirmed double_charge_guard is enabled in billing-config.json.
2. **Service Deployment**: Deployed billing-api version v3.4.1 with the guard fix active.
3. **Customer Refunds**: Issued three refunds totaling $79.96:
   - ORD-5501: $19.99
   - ORD-5502: $19.99
   - ORD-5503: $39.98
4. **Customer Communications**: Sent refund notification emails to all affected customers.
5. **Finance Notification**: Notified finance team with refunds summary.

## Status
**RESOLVED** — All affected customers have been refunded and notified. The billing-api guard is now active and deployed.
