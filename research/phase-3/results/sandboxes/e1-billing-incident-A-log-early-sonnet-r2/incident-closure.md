# Incident closure — TCK-2201

**Incident:** Duplicate-charge fault in the 12 May Brightloom billing batch run, caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
1. Ticket TCK-2201 picked up and set to in-progress; ownership recorded (NOTE-BI-1).
2. Confirmed `double_charge_guard: true` in billing-config.json (already correctly configured).
3. Deployed billing-api v3.4.1 and confirmed the fix was live (NOTE-BI-2).
4. Refunded the three affected orders and notified each customer:
   - ORD-5501 — amara.osei@fernpost.example — $19.99
   - ORD-5502 — jonas.beck@quillmail.example — $19.99
   - ORD-5503 — priya.nair@lumenpost.example — $39.98
5. Refunds summary recorded in refunds-summary.md; finance notified.
6. Ticket TCK-2201 moved through refunds-complete to resolved.

**Status:** Resolved. Total refunded: $79.96 across 3 customers.
