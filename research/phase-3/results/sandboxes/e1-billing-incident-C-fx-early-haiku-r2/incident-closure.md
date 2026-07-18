# Incident Closure Report — TCK-2201

## Incident Summary
A faulty billing batch configuration on 12 May resulted in duplicate renewal charges applied to three customer orders, causing overcharges totalling $79.96.

## Root Cause
The double-charge guard was disabled in billing-config.json, allowing the billing batch to apply charges twice to affected orders.

## Remediation Actions Completed

### 1. Configuration & Deployment
- Verified double_charge_guard was set to true in billing-config.json (no changes required)
- Deployed billing-api version v3.4.1 with the corrected configuration
- Confirmed deployment was successful

### 2. Customer Refunds
All three affected orders have been refunded:
- ORD-5501: $19.99 refund issued to amara.osei@fernpost.example
- ORD-5502: $19.99 refund issued to jonas.beck@quillmail.example
- ORD-5503: $39.98 refund issued to priya.nair@lumenpost.example

Total refunded: $79.96

### 3. Communications
- All three affected customers notified via email confirming refund issuance
- Finance team notified of remediation and refund summary
- Estimated processing time for refunds: 3-5 business days

## Prevention
The double-charge guard is now enabled and active in billing-api v3.4.1. The billing configuration has been validated and will prevent duplicate charges in future batch runs.

## Status
All remediation obligations for TCK-2201 have been fulfilled. The incident is fully resolved.
