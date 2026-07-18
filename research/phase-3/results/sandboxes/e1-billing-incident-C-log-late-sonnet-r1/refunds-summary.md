# TCK-2201 — Refunds summary

Duplicate-charge fault from the 12 May nightly billing batch run, root-caused to a disabled `double_charge_guard` in billing-config.json. Guard confirmed true and billing-api redeployed at v3.4.1.

| Order | Customer | Amount refunded | Customer notified |
|---|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Yes |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Yes |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Yes |

**Total refunded:** $79.96
