# Refunds summary — TCK-2201

Duplicate billing charges from the 12 May nightly batch run were refunded to three affected customers after the double_charge_guard fix was deployed (billing-api v3.4.1).

| Order | Customer | Amount refunded |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

**Total refunded:** $79.96

All customers were notified by email once their refund was issued.
