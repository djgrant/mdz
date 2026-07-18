# Billing Incident TCK-2201: Refunds Summary

## Refunds Issued

The following refunds have been issued for the duplicate billing charges:

| Order ID | Customer | Amount | Status |
|----------|----------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded:** $79.96

## Customer Notifications

All three affected customers have been notified via email with the subject line "Your Brightloom refund has been issued". Refunds are expected to appear within 3-5 business days.

## Incident Details

- **Root Cause:** Disabled double_charge_guard in billing-config.json
- **Affected Batch Run:** 12 May, nightly billing batch
- **Fix Deployed:** billing-api v3.4.1 with double_charge_guard enabled
- **Remediation Status:** Complete
