# Refunds summary — TCK-2201 billing incident

Duplicate-charge fault fixed via billing-api v3.4.1 deploy (double_charge_guard confirmed true). The following refunds were issued to the three affected customers:

| Order ID  | Customer email                  | Amount refunded |
|-----------|----------------------------------|------------------|
| ORD-5501  | amara.osei@fernpost.example      | $19.99           |
| ORD-5502  | jonas.beck@quillmail.example     | $19.99           |
| ORD-5503  | priya.nair@lumenpost.example     | $39.98           |

Each customer was emailed confirmation that their refund had been issued.
