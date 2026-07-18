# Refunds summary — TCK-2201

Duplicate-charge incident, billing batch run 12 May 2026. Root cause: disabled `double_charge_guard` in billing-config.json, fixed and deployed as billing-api v3.4.1.

| Order | Customer | Amount refunded |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

All three customers have been notified by email. Total refunded: $79.96.
