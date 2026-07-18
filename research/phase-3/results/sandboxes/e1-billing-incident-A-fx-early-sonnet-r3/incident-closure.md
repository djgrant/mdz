# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in Brightloom's nightly billing batch run (12 May), caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Confirmed `double_charge_guard` was already set to `true` in billing-config.json.
- Deployed billing-api v3.4.1 and confirmed it live.
- Refunded all three affected orders (ORD-5501, ORD-5502, ORD-5503; total $79.96) and notified each customer.
- Sent refunds summary to finance@brightloom.example.

**Status:** Ticket TCK-2201 resolved.
