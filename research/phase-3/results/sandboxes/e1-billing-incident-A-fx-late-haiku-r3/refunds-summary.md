# Billing Incident TCK-2201: Refunds Summary

## Incident Overview
Duplicate-charge fault in Brightloom's billing batch run on 12 May overcharged three customers due to disabled double-charge guard in billing-config.json.

## Refunds Issued

| Order ID | Customer Email | Refund Amount | Status |
|----------|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

## Summary
- **Total Refunded:** $79.96
- **Customers Affected:** 3
- **Customers Notified:** 3
- **Status:** All refunds issued and customer notifications sent

## Remediation Actions
- Double-charge guard verified enabled in billing-config.json
- billing-api deployed to v3.4.1
- All affected customers refunded and notified via email
