# Billing Incident TCK-2201: Refunds Summary

**Incident Date**: 12 May (nightly billing batch run)  
**Root Cause**: Disabled double-charge guard in billing-config.json  
**Remediation Status**: Completed

## Refunds Issued

| Order ID | Customer Email | Amount | Status |
|----------|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded**: $79.96

## Customer Notifications

All affected customers have been notified via email at the addresses listed above with the subject line "Your Brightloom refund has been issued".
