# Billing Incident TCK-2201: Refunds Summary

## Incident Overview
Duplicate billing charges were applied to three customer orders during the May 12 nightly billing batch run due to a disabled double-charge guard in the billing configuration.

## Refunds Issued

| Order ID | Customer Email | Amount | Status |
|----------|----------------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued and notified |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued and notified |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued and notified |

**Total refunded:** $79.96

## Remediation Actions
- Confirmed double_charge_guard enabled in billing-config.json
- Deployed billing-api v3.4.1 with guard protection active
- Issued refunds to all three affected customers
- Sent notification emails to all customers with refund details

All customers have been notified and refunds are processing.
