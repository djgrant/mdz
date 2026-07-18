# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in Brightloom's billing batch run (12 May), caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Confirmed `double_charge_guard: true` in billing-config.json.
- Deployed billing-api v3.4.1 with the fix; confirmed live via ops_lookup.
- Refunded all three affected orders (ORD-5501, ORD-5502, ORD-5503) totalling $79.96.
- Notified all three affected customers by email.
- Sent refunds summary to finance@brightloom.example.

**Status:** TCK-2201 resolved.
