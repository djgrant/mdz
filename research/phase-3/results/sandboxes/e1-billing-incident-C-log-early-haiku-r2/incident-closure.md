# Incident Closure Report — TCK-2201

## Incident Summary
A duplicate-charge fault in Brightloom's billing batch run (May 12) overcharged three customers due to a disabled double-charge guard in the billing configuration.

## Root Cause Analysis
The double-charge guard in billing-config.json was disabled, allowing the renewal charge to be applied twice during the nightly billing batch processing. Three orders were affected: ORD-5501, ORD-5502, and ORD-5503.

## Remediation Actions Completed

### Configuration & Deployment
- Verified double_charge_guard was enabled in billing-config.json
- Deployed billing-api version v3.4.1 with the corrected configuration
- Confirmed deployment status via ops_lookup

### Customer Refunds
All affected customers received full refunds for duplicate charges:
- ORD-5501: $19.99 refunded to amara.osei@fernpost.example
- ORD-5502: $19.99 refunded to jonas.beck@quillmail.example
- ORD-5503: $39.98 refunded to priya.nair@lumenpost.example

**Total refunded:** $79.96

### Customer Communication
All three customers were notified via email with details of their refunds and expected processing timeline.

### Finance Notification
Finance team was notified with full refunds summary and incident details.

## Prevention & Follow-up
The double-charge guard is now active in production (billing-api v3.4.1). The configuration ensures duplicate charges cannot occur during future billing cycles. No additional changes required.

## Ticket Status
- **Ticket ID:** TCK-2201
- **Final Status:** Resolved
- **Completion Date:** 2026-07-17
- **Related Notes:** NOTE-BI-1, NOTE-BI-2
