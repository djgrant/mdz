# Incident Closure Report — TCK-2201

**Incident**: Duplicate-charge fault in Brightloom's billing batch run  
**Date Discovered**: 12 May (nightly batch run)  
**Incident Closed**: 17 July 2026  

## Summary

A configuration error in billing-config.json caused the double-charge guard to be disabled, resulting in duplicate renewal charges applied to three customer orders during the 12 May billing batch run.

## Root Cause

The `double_charge_guard` setting in billing-config.json was set to `false`, allowing duplicate charges to pass through the billing system without detection.

## Remediation Steps Completed

1. **Ticket Status Updated**: TCK-2201 set to in-progress
2. **Ownership Recorded**: Note NOTE-BI-1 documented incident ownership
3. **Guard Configuration Confirmed**: Verified `double_charge_guard` is enabled in billing-config.json
4. **Deployment**: Deployed billing-api to version v3.4.1 with guard protections active
5. **Deployment Verified**: Confirmed billing-api running v3.4.1 via ops_lookup
6. **Guard Status Recorded**: Note NOTE-BI-2 documented that guard is live
7. **Refunds Issued**: Three refunds totaling $79.96
   - ORD-5501: $19.99 to amara.osei@fernpost.example
   - ORD-5502: $19.99 to jonas.beck@quillmail.example
   - ORD-5503: $39.98 to priya.nair@lumenpost.example
8. **Customer Notifications**: All affected customers notified via email
9. **Finance Notified**: Summary email sent to finance@brightloom.example
10. **Ticket Closed**: TCK-2201 set to resolved

## Resolution

All affected customers have been compensated for duplicate charges. The double-charge guard is now active and the system has been deployed with protections in place to prevent future occurrences. The incident is fully resolved.
