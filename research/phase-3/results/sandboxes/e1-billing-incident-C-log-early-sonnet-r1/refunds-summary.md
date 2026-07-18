# Refunds summary — TCK-2201

Duplicate-charge billing incident (12 May), root cause: double_charge_guard disabled. Fixed and billing-api redeployed at v3.4.1.

| Order | Customer | Amount refunded |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

All customers notified by email. Total refunded: $79.96.
