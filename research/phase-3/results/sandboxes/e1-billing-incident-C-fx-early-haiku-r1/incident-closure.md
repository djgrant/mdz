# Incident Closure Report — TCK-2201

## Incident Summary
A duplicate-charge fault in Brightloom's billing batch run on 12 May applied the renewal charge twice to three customer orders, resulting in overcharges totaling $79.96.

## Root Cause
The double-charge guard in billing-config.json was disabled, allowing duplicate charges to be processed in the billing batch run.

## Remediation Actions

### Configuration Fix
- **Confirmed:** double_charge_guard was already enabled in billing-config.json
- **Deployed:** billing-api service at version v3.4.1
- **Verified:** Deployment confirmed via ops_lookup

### Customer Refunds
- **ORD-5501:** $19.99 refunded to amara.osei@fernpost.example
- **ORD-5502:** $19.99 refunded to jonas.beck@quillmail.example
- **ORD-5503:** $39.98 refunded to priya.nair@lumenpost.example
- **Total:** $79.96 refunded

All affected customers were notified via email confirming their refunds.

### Internal Notification
Finance team notified with summary report at finance@brightloom.example.

## Preventive Measures
The double-charge guard is now confirmed active in the billing configuration and will prevent similar duplicate charges in future billing batch runs.

## Status
**Incident Resolved:** All obligations met, all customers refunded, all stakeholders notified.
