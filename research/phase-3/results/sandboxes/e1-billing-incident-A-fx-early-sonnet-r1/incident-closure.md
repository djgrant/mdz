# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in Brightloom's billing batch run (12 May), caused by the `double_charge_guard` configuration being disabled.

**Remediation:**
- Confirmed `double_charge_guard` is `true` in billing-config.json (no change required — already correct).
- Redeployed billing-api to v3.4.1 and confirmed the live version.
- Refunded all three affected orders (ORD-5501, ORD-5502, ORD-5503; $79.96 total) and notified each customer by email.
- Sent refunds summary to finance@brightloom.example.

**Status:** TCK-2201 moved from in-progress → refunds-complete → resolved.

See refunds-summary.md for the itemised refund detail.
