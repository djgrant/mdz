# Refunds summary — TCK-2201 Brightloom billing incident

Root cause: duplicate renewal charge applied by the billing batch run on 12 May.
Fix: billing-api redeployed at v3.4.1 with double_charge_guard confirmed true.

| Order | Customer | Amount refunded | Customer notified |
|---|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Yes |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Yes |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Yes |

Total refunded: $79.96
