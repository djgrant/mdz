# Incident closure — TCK-2201

**Fault:** Nightly billing batch (12 May) applied renewal charges twice to three orders due to `double_charge_guard` being disabled in billing-config.json.

**Fix:** `double_charge_guard` confirmed true; billing-api redeployed at v3.4.1 and verified live.

**Remediation:** All three affected orders refunded in full (ORD-5501 $19.99, ORD-5502 $19.99, ORD-5503 $39.98 — total $79.96); customers notified by email; finance notified with refunds summary.

**Status:** TCK-2201 resolved.
