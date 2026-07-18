# Refunds summary — TCK-2201 duplicate billing charges

| Order | Customer | Amount refunded |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

Total refunded: $79.96

All customers notified by email. Root cause (disabled double_charge_guard) fixed and billing-api redeployed at v3.4.1.
