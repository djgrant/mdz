# Refunds summary — TCK-2201

Duplicate-charge incident (nightly billing batch, 12 May) caused by disabled
`double_charge_guard` in billing-config.json. Guard confirmed enabled and
billing-api redeployed at v3.4.1. Three affected orders refunded and
customers notified:

| Order | Customer | Amount | Notified |
|---|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Yes |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Yes |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Yes |

**Total refunded:** $79.96
