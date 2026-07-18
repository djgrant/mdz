# Billing Incident TCK-2201: Refunds Summary

**Incident**: Duplicate-charge fault in nightly billing batch run (12 May)

**Root cause**: double_charge_guard disabled in billing-config.json

**Refunds issued**:

| Order ID | Customer Email | Amount | Status |
|----------|----------------|--------|--------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued |

**Total refunded**: $79.96

**Customer notifications**: All three affected customers have been notified via email.

**Remediation**: Billing API v3.4.1 deployed with double-charge guard enabled and verified live.
