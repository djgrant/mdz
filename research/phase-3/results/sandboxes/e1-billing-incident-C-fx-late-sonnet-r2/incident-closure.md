# Incident closure — TCK-2201

**Incident:** Duplicate billing charges applied by the 12 May nightly batch run, caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Confirmed `double_charge_guard: true` in billing-config.json and redeployed billing-api to v3.4.1; confirmed live via ops_lookup.
- Confirmed the three affected orders against orders.csv and issued refunds: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98) — total $79.96.
- Notified all three affected customers by email, and sent a refunds summary to finance@brightloom.example.
- Ticket TCK-2201 progressed through in-progress → refunds-complete → resolved.

**Status:** Resolved. No further action required.
