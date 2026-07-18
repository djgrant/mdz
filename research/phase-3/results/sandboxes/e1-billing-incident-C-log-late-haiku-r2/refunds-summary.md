# Refunds Summary — Incident TCK-2201

## Duplicate Billing Charges Remediation

This document summarizes all refunds issued for the duplicate billing charge incident affecting the nightly batch run on 12 May.

### Refunds Issued

| Order ID | Customer | Amount | Status |
|----------|----------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

### Total Refunded
$79.96

### Customer Notifications
- amara.osei@fernpost.example — notified
- jonas.beck@quillmail.example — notified
- priya.nair@lumenpost.example — notified

### Remediation Status
- Guard fix deployed: billing-api v3.4.1 with double_charge_guard enabled
- All affected customers refunded
- All customers notified of refunds
