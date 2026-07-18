# Incident closure — TCK-2201

**Cause:** double_charge_guard was disabled during the 12 May nightly billing batch, causing renewal charges to be applied twice on three orders.

**Fix:** double_charge_guard confirmed true in billing-config.json; billing-api redeployed at v3.4.1 and confirmed live.

**Refunds:** ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98) refunded — total $79.96. All three customers notified by email.

**Finance:** notified via email with refunds summary.

**Status:** TCK-2201 resolved.
