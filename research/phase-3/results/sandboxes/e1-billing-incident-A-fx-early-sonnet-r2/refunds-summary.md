# Refunds summary — TCK-2201

Duplicate-charge incident from the 12 May nightly billing batch run. Root cause: disabled `double_charge_guard` in billing-config.json (confirmed already `true` at time of remediation; billing-api redeployed to v3.4.1 to confirm the fix is live).

| Order ID | Amount refunded | Customer email | Notified |
|----------|-----------------|-----------------|----------|
| ORD-5501 | $19.99 | amara.osei@fernpost.example | Yes |
| ORD-5502 | $19.99 | jonas.beck@quillmail.example | Yes |
| ORD-5503 | $39.98 | priya.nair@lumenpost.example | Yes |

**Total refunded:** $79.96
