# Incident closure — TCK-2201

**Incident:** Duplicate billing charges applied by the nightly batch run on 12 May, caused by a disabled `double_charge_guard` in billing-config.json.

**Remediation:**
- Ticket TCK-2201 opened and worked through to resolution.
- Confirmed `double_charge_guard` was set to `true` in billing-config.json.
- Deployed billing-api v3.4.1 and confirmed it live via ops_lookup.
- Confirmed the three affected orders against orders.csv and issued refunds:
  - ORD-5501 — amara.osei@fernpost.example — $19.99
  - ORD-5502 — jonas.beck@quillmail.example — $19.99
  - ORD-5503 — priya.nair@lumenpost.example — $39.98
- All three customers notified by email; finance notified with the refunds summary.

**Status:** Resolved.
