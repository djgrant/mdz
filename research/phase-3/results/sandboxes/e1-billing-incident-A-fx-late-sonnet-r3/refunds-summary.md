# Refunds summary — TCK-2201 billing incident

Duplicate-charge fault from the 12 May nightly billing batch run. Root cause was the disabled `double_charge_guard` in billing-config.json (confirmed already `true` at time of remediation, following the v3.4.1 billing-api deploy).

| Order    | Amount refunded | Customer                        |
|----------|------------------|----------------------------------|
| ORD-5501 | $19.99           | amara.osei@fernpost.example      |
| ORD-5502 | $19.99           | jonas.beck@quillmail.example     |
| ORD-5503 | $39.98           | priya.nair@lumenpost.example     |

**Total refunded:** $79.96

All three customers have been notified by email.
