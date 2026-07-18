# Refunds summary — TCK-2201 duplicate billing charges

| Order | Customer | Amount | Refund | Email sent |
|---|---|---|---|---|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Issued | Yes |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Issued | Yes |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Issued | Yes |

**Total refunded:** $79.96

Root cause: `double_charge_guard` disabled in billing-config.json, allowing the nightly batch run on 12 May to apply renewal charges twice to the above orders.

Fix: `double_charge_guard` confirmed `true` in billing-config.json; billing-api redeployed at v3.4.1 and confirmed live.
