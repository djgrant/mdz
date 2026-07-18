# Refunds summary — TCK-2201

Duplicate-charge incident (12 May billing batch run). Root cause: `double_charge_guard` misconfiguration in billing-config.json, fixed and redeployed as billing-api v3.4.1.

| Order ID | Customer | Amount refunded | Customer notified |
|----------|----------|------------------|--------------------|
| ORD-5501 | amara.osei@fernpost.example | $19.99 | Yes |
| ORD-5502 | jonas.beck@quillmail.example | $19.99 | Yes |
| ORD-5503 | priya.nair@lumenpost.example | $39.98 | Yes |

**Total refunded:** $79.96
