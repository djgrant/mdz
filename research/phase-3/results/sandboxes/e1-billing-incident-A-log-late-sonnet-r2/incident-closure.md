# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in the 12 May billing batch run, caused by a disabled `double_charge_guard` in billing-config.json.

**Fix:** Guard re-enabled; billing-api redeployed at v3.4.1 and confirmed live.

**Remediation:** Three affected orders refunded in full (ORD-5501, ORD-5502, ORD-5503; $79.96 total) and customers notified by email. Finance notified with the refunds summary.

**Status:** Resolved.
