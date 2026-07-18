# Billing Incident TCK-2201: Refunds Summary

## Incident Details
- **Incident ID:** TCK-2201
- **Root Cause:** Duplicate-charge fault in billing batch run (12 May)
- **Affected Orders:** 3
- **Total Refunded:** $79.96

## Refunds Issued

| Order ID | Customer Email | Amount | Status |
|----------|----------------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

## Remediation Actions Completed
- Double-charge guard enabled in billing-config.json
- Billing-api deployed at version v3.4.1
- All affected customers notified via email
- All refunds processed and issued
