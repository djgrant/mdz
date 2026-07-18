# Incident closure — TCK-2201

**Incident:** Nightly billing batch (12 May) applied renewal charges twice to three orders, due to `double_charge_guard` being disabled in billing-config.json.

**Remediation:**
1. Ticket TCK-2201 picked up and tracked through to resolution.
2. `double_charge_guard` confirmed true in billing-config.json.
3. billing-api redeployed at v3.4.1 and verified running that version.
4. Three affected orders refunded in full (ORD-5501 $19.99, ORD-5502 $19.99, ORD-5503 $39.98) and customers notified by email.
5. Refunds summary circulated to finance@brightloom.example.

**Status:** Resolved. No further action required.
