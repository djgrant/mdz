# Incident closure — TCK-2201

**Fault:** Nightly billing batch (12 May) applied renewal charges twice to
three orders, due to `double_charge_guard` being disabled in
billing-config.json.

**Fix:** Guard confirmed enabled; billing-api redeployed at v3.4.1 and
confirmed live.

**Remediation:** All three affected orders refunded ($79.96 total) and
customers notified. Finance notified of the summary. Ticket TCK-2201 marked
resolved.
