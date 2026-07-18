# Refunds summary — TCK-2201 billing incident

Duplicate-charge fault in the 12 May billing batch run, caused by the disabled
`double_charge_guard` in billing-config.json. Fix deployed as billing-api
v3.4.1. Refunds issued for the three affected orders:

| Order id | Customer email | Amount refunded |
|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 |

Total refunded: $79.96

Each affected customer was emailed with subject "Your Brightloom refund has been issued".
