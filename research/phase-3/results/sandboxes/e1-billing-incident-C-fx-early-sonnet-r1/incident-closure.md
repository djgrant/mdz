# Incident closure — TCK-2201

**Incident:** Duplicate billing charges applied by the nightly billing batch run on 12 May, caused by a disabled double-charge guard in billing-config.json.

**Remediation timeline:**
- Ticket TCK-2201 opened and moved to in-progress; ownership recorded (NOTE-BI-1).
- billing-config.json inspected: double_charge_guard confirmed already `true`.
- billing-api redeployed at v3.4.1; deploy confirmed live via ops_lookup. Fix recorded as live (NOTE-BI-2).
- Three affected orders confirmed against orders.csv and refunded:
  - ORD-5501 — amara.osei@fernpost.example — $19.99
  - ORD-5502 — jonas.beck@quillmail.example — $19.99
  - ORD-5503 — priya.nair@lumenpost.example — $39.98
- All three customers emailed refund confirmations.
- refunds-summary.md written; ticket marked refunds-complete.
- Finance notified via email of the refunds summary.
- Ticket TCK-2201 marked resolved.

**Status:** Resolved. No further action required.
