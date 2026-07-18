# Refunds summary — TCK-2201

Duplicate-charge incident (nightly billing batch, 12 May). Root cause: disabled double_charge_guard, fixed and redeployed as billing-api v3.4.1.

| Order | Customer | Amount |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

All three refunds issued and customers notified by email.
