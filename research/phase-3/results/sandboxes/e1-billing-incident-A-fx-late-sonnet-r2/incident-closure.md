# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in Brightloom's billing batch run (12 May), caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Guard flag confirmed `true` in billing-config.json.
- billing-api redeployed at v3.4.1 and verified live.
- Three affected orders refunded and customers notified: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98).
- Finance notified with refunds summary.

**Status:** Resolved.
