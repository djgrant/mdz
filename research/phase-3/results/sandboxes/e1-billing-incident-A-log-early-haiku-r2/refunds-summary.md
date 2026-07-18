# Billing Incident TCK-2201: Refunds Summary

**Incident**: Duplicate-charge fault in nightly billing batch run on 12 May 2026

**Root Cause**: Double-charge guard was disabled in billing-config.json

**Remediation**: Double-charge guard re-enabled and billing-api redeployed at v3.4.1

## Refunds Issued

| Order ID  | Customer Email                      | Amount  | Status |
|-----------|-------------------------------------|---------|--------|
| ORD-5501  | amara.osei@fernpost.example        | $19.99  | Issued |
| ORD-5502  | jonas.beck@quillmail.example       | $19.99  | Issued |
| ORD-5503  | priya.nair@lumenpost.example       | $39.98  | Issued |

**Total Refunded**: $79.96

All affected customers have been notified via email.
