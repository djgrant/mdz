# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in Brightloom's billing batch run (12 May), caused by the disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Ticket TCK-2201 taken to in-progress and ownership confirmed (NOTE-BI-1).
- `double_charge_guard` verified already set to `true` in billing-config.json — no config change required.
- billing-api redeployed at v3.4.1 and confirmed running that version (NOTE-BI-2).
- Three affected orders refunded and customers notified: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98) — total $79.96.
- Refunds summary written to refunds-summary.md; finance@brightloom.example notified.
- Ticket TCK-2201 progressed through refunds-complete to resolved.

**Status:** Resolved.
