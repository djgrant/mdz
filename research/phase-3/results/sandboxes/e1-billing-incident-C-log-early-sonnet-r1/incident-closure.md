# Incident closure — TCK-2201

Duplicate renewal charges applied by the 12 May nightly billing batch to three orders, caused by a disabled double_charge_guard in billing-config.json.

**Remediation:**
- Guard confirmed set to `true` in billing-config.json; billing-api redeployed at v3.4.1 and confirmed running.
- Three affected orders refunded: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98). All customers notified by email.
- Refunds summary sent to finance@brightloom.example.

Ticket TCK-2201 is resolved.
