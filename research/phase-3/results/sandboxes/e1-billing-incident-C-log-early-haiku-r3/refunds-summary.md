# Billing Incident TCK-2201: Refunds Summary

## Refunds Issued

| Order ID | Customer Email | Amount | Status |
|----------|----------------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded:** $79.96

## Customer Notifications

All three affected customers have been notified via email of their refunds with the subject "Your Brightloom refund has been issued".

## Root Cause

The duplicate billing charges resulted from a disabled double_charge_guard in billing-config.json during the nightly billing batch run on 12 May.

## Resolution

- Guard enabled and verified in billing-config.json
- billing-api deployed at version v3.4.1
- All affected customers refunded and notified
