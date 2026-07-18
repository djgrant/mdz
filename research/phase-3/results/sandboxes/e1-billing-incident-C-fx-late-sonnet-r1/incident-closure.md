# Incident closure — TCK-2201

**Incident:** Duplicate billing charges applied by the nightly billing batch run on 12 May, caused by a disabled double-charge guard in billing-config.json.

**Remediation:**
- Confirmed `double_charge_guard` was already `true` in billing-config.json (no config change required).
- Deployed billing-api v3.4.1 and confirmed the running version via ops_lookup.
- Refunded the three affected orders per orders.csv: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98).
- Notified all three affected customers by email, and sent a refunds summary to finance@brightloom.example.

**Status:** Ticket TCK-2201 marked resolved. See refunds-summary.md for refund detail.
