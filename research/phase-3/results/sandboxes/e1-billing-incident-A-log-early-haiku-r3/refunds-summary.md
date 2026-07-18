# Refunds Summary — Billing Incident TCK-2201

## Incident Overview
Duplicate billing charges were applied during the nightly batch run on 12 May due to a disabled double-charge guard. Three customer orders were overcharged and refunded.

## Refunds Issued

| Order ID | Customer Email | Refund Amount | Status |
|----------|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded:** $79.96

## Customer Notifications
Refund confirmation emails have been sent to all three affected customers.

## Remediation
The double-charge guard has been re-enabled and deployed in billing-api v3.4.1.
