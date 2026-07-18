# Refunds summary — TCK-2201

Duplicate-charge incident (nightly billing batch, 12 May) — three orders refunded in full.

| Order | Customer | Amount |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

All customers notified by email. Root cause (disabled `double_charge_guard` in billing-config.json) fixed and billing-api redeployed at v3.4.1.
