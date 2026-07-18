# TCK-2201 — Incident closure

**Fault:** The nightly billing batch run on 12 May double-charged three orders due to a disabled `double_charge_guard` in billing-config.json.

**Fix:** `double_charge_guard` confirmed set to `true`; billing-api redeployed and confirmed running v3.4.1.

**Remediation:** All three affected orders refunded in full ($79.96 total) and customers notified by email. Finance notified with refunds summary.

**Status:** Resolved.
