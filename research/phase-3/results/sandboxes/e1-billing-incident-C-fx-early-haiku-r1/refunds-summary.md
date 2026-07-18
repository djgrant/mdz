# Refunds Summary — Incident TCK-2201

## Billing Incident Overview
A duplicate-charge fault in Brightloom's billing batch run on 12 May overcharged three customers. The root cause was the disabled double-charge guard in billing-config.json.

## Refunds Issued

| Order ID | Customer Email | Amount | Status |
|----------|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded:** $79.96

## Customers Notified
All three affected customers have been notified via email with subject line: "Your Brightloom refund has been issued"

- amara.osei@fernpost.example
- jonas.beck@quillmail.example
- priya.nair@lumenpost.example

## Resolution Status
All refunds have been successfully issued and all customers have been notified.
