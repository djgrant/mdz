# Incident closure — TCK-2201

**Incident:** Duplicate billing charges from the 12 May nightly batch run, caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Confirmed `double_charge_guard: true` in billing-config.json.
- Deployed billing-api v3.4.1 with the fix; confirmed live via ops_lookup.
- Confirmed the three affected orders against orders.csv and issued refunds totalling $79.96 (ORD-5501: $19.99, ORD-5502: $19.99, ORD-5503: $39.98).
- Notified all three affected customers and finance@brightloom.example.

**Status:** Resolved.
