# Refunds Summary — Billing Incident TCK-2201

## Incident
Duplicate-charge fault in nightly billing batch run on 12 May applied renewal charges twice to affected orders.

## Refunds Issued

| Order ID | Customer | Amount | Status |
|----------|----------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total Refunded:** $79.96

## Actions Completed
- ✓ Refunds issued to all three affected orders
- ✓ Customer notification emails sent
- ✓ Double-charge guard enabled and deployed (billing-api v3.4.1)
