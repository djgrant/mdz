# Incident closure — TCK-2201

**Incident:** Duplicate billing charges applied to three customer orders during the nightly batch run on 12 May, caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- `double_charge_guard` confirmed `true` in billing-config.json.
- billing-api redeployed at v3.4.1 and confirmed live.
- Refunds issued: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98) — total $79.96.
- All three affected customers notified by email.
- Finance notified with refunds summary.

**Status:** Resolved. Ticket TCK-2201 closed.
