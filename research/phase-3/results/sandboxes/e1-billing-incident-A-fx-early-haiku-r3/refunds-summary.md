# Billing Incident TCK-2201: Refunds Summary

## Incident Overview
Duplicate-charge fault in Brightloom's nightly billing batch run on 12 May affected three customer orders due to disabled double-charge guard in billing configuration.

## Refunds Issued

| Order ID | Customer Email | Amount Refunded | Status |
|----------|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded: $79.96**

## Customer Notifications
All three affected customers have been notified via email confirming their refunds have been issued.

## Remediation Actions Completed
- Deployment of billing-api v3.4.1 with double-charge guard enabled
- All refunds processed and issued
- Customer notifications sent
