# Incident Closure Report — TCK-2201

## Incident Summary
A duplicate-charge fault in Brightloom's nightly billing batch run on 12 May applied renewal charges twice to three customer orders, resulting in overcharges totalling $79.96.

## Root Cause
The double-charge guard configuration in billing-config.json was disabled, allowing the batch process to apply duplicate charges without detection.

## Remediation Actions

### 1. Configuration & Deployment
- Verified double_charge_guard was enabled in billing-config.json
- Deployed billing-api version v3.4.1 with the guard fix active
- Confirmed deployment via ops lookup

### 2. Customer Refunds
Three refunds were issued:
- ORD-5501: $19.99 to amara.osei@fernpost.example
- ORD-5502: $19.99 to jonas.beck@quillmail.example
- ORD-5503: $39.98 to priya.nair@lumenpost.example

Total refunded: $79.96

### 3. Communication
- Customer notification emails sent to all affected parties
- Finance team notified of refunds summary
- Ticket TCK-2201 updated through resolution workflow

## Resolution Status
✓ Incident resolved
✓ All affected customers refunded
✓ Root cause addressed with deployment
✓ No further action required

**Closure Date:** 17 July 2026
