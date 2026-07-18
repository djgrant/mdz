# Billing Incident TCK-2201: Refunds Summary

## Incident Overview
Duplicate-charge fault in Brightloom's billing batch run on 12 May resulted in overcharges to three customers.

## Refunds Issued

| Order ID | Customer Email | Amount | Status |
|----------|----------------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded:** $79.96

## Customer Notifications
Refund notification emails sent to all affected customers on the date of remediation.

## Remediation Details
- Double-charge guard re-enabled in billing-config.json
- billing-api deployed at version v3.4.1
- All refunds processed and confirmed
