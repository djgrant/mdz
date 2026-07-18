# Incident closure — TCK-2201

## Summary
The nightly billing batch run on 12 May applied renewal charges twice to three orders, caused by a disabled double-charge guard in billing-config.json.

## Remediation
- Confirmed double_charge_guard was true in billing-config.json (no change required).
- Deployed billing-api v3.4.1 and confirmed it live.
- Confirmed the three affected orders against orders.csv and issued refunds: ORD-5501 ($19.99), ORD-5502 ($19.99), ORD-5503 ($39.98).
- Notified all three affected customers by email.
- Notified finance@brightloom.example with the refunds summary.

## Status
Ticket TCK-2201 is resolved. Total refunded: $79.96.
