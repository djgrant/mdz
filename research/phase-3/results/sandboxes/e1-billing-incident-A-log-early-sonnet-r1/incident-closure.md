# Incident closure — TCK-2201

**Root cause:** the double_charge_guard in billing-config.json was disabled during the nightly billing batch run on 12 May, causing renewal charges to be applied twice to a subset of orders.

**Remediation:**
- double_charge_guard confirmed set to true in billing-config.json.
- billing-api redeployed at v3.4.1 and confirmed live with the guard active.
- Three affected orders refunded in full: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98) — total $79.96.
- Affected customers notified by email.
- Finance notified with refunds summary.

**Status:** resolved.
