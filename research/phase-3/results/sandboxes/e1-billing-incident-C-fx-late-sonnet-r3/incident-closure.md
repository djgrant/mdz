# Incident closure — TCK-2201

**Incident:** Duplicate renewal charges applied to three customer orders by the billing batch run on 12 May, caused by the double-charge guard in billing-config.json.

**Remediation:**
- double_charge_guard confirmed true in billing-config.json.
- billing-api redeployed at v3.4.1 and confirmed live.
- Refunds issued and customers notified for all three affected orders (ORD-5501, ORD-5502, ORD-5503), totalling $79.96.
- Finance notified with refunds summary.

**Status:** Resolved.
