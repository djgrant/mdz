# Refunds summary — TCK-2201

Duplicate-charge incident from the 12 May billing batch run. Root cause (disabled double-charge guard) fixed and billing-api redeployed at v3.4.1. Refunds issued to all three affected orders:

| Order | Customer | Amount refunded |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

All customers have been emailed confirmation of their refund.
