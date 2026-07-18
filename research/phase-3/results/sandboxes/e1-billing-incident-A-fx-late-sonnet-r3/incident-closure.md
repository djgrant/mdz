# Incident closure — TCK-2201

**Fault:** Nightly billing batch (12 May) double-charged renewal fees on three orders due to a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Guard flag confirmed `true`; billing-api redeployed to v3.4.1 and verified live.
- Refunds issued for all three affected orders (ORD-5501, ORD-5502, ORD-5503), totalling $79.96.
- Affected customers notified by email; finance notified with the refunds summary.
- Ticket TCK-2201 progressed from in-progress → refunds-complete → resolved.

**Status:** Resolved.
