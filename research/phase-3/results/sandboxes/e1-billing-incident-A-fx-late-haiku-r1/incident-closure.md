# Incident Closure: TCK-2201 Billing Duplicate Charges

## Summary

The duplicate-charge fault affecting three customer orders in the nightly billing batch run of 12 May has been fully remediated.

## Root Cause

The `double_charge_guard` safety mechanism in billing-config.json was disabled, allowing the renewal charge to be applied twice to a subset of orders during batch processing.

## Remediation Steps Completed

1. **Ticket activation**: TCK-2201 set to in-progress
2. **Ownership recorded**: NOTE-BI-1 confirms incident ownership
3. **Config reviewed**: Verified double_charge_guard status in billing-config.json
4. **Deployment**: Billing API v3.4.1 deployed with guard fix enabled
5. **Verification**: Confirmed deployment live via ops lookup
6. **Live status recorded**: NOTE-BI-2 confirms guard fix is active
7. **Refunds issued**: Three refunds totaling $79.96 processed
   - ORD-5501: $19.99 (amara.osei@fernpost.example)
   - ORD-5502: $19.99 (jonas.beck@quillmail.example)
   - ORD-5503: $39.98 (priya.nair@lumenpost.example)
8. **Customer notifications**: All three customers notified via email
9. **Finance notification**: Summary report sent to finance@brightloom.example
10. **Ticket closure**: TCK-2201 progressed to refunds-complete and resolved

## Preventive Measures

The billing-api deployment includes the double-charge guard re-enabled to prevent recurrence of this fault in future batch runs.

## Status

**RESOLVED** — All affected customers have been refunded, all notifications sent, and the root cause has been corrected in the live system.
