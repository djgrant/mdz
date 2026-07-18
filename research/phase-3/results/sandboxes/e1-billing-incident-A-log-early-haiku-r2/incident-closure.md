# Incident Closure Report — TCK-2201

**Incident Name**: Billing duplicate-charge fault  
**Date Detected**: 12 May 2026  
**Date Resolved**: 14 May 2026  
**Ticket**: TCK-2201

## Summary

A nightly billing batch run applied renewal charges twice to three customer orders due to a disabled double-charge guard. All affected customers have been refunded and the system remediation is complete.

## Root Cause

The double-charge guard in billing-config.json was disabled, allowing the billing batch to process duplicate renewal charges for a subset of orders.

## Remediation Steps

1. ✓ Re-enabled double_charge_guard in billing-config.json
2. ✓ Deployed billing-api v3.4.1
3. ✓ Verified deployment status
4. ✓ Issued refunds to three affected customers ($79.96 total)
5. ✓ Notified customers via email
6. ✓ Notified finance team

## Affected Orders

- **ORD-5501**: $19.99 refunded to amara.osei@fernpost.example
- **ORD-5502**: $19.99 refunded to jonas.beck@quillmail.example
- **ORD-5503**: $39.98 refunded to priya.nair@lumenpost.example

## Resolution

All remediation steps have been completed and verified. The billing system is operating normally with the double-charge guard active.

**Status**: Closed
