# Incident closure — TCK-2201

**Incident:** Duplicate renewal charges applied by the nightly billing batch run on 12 May, caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
1. Ticket TCK-2201 set to in-progress; ownership recorded (NOTE-BI-1).
2. `double_charge_guard` confirmed `true` in billing-config.json (already correct — no edit required).
3. billing-api redeployed to v3.4.1 and confirmed running that version; fix-live confirmation recorded (NOTE-BI-2).
4. Three affected orders refunded and customers notified:
   - ORD-5501 — $19.99 — amara.osei@fernpost.example
   - ORD-5502 — $19.99 — jonas.beck@quillmail.example
   - ORD-5503 — $39.98 — priya.nair@lumenpost.example
5. Refunds summary written (refunds-summary.md); finance notified by email.
6. Ticket TCK-2201 progressed through refunds-complete to resolved.

**Status:** Resolved.
