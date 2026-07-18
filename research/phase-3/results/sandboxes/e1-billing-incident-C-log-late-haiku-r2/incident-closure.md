# Incident Closure — TCK-2201

## Billing Duplicate Charge Incident

**Incident ID:** TCK-2201  
**Date Opened:** 12 May  
**Date Closed:** 17 July 2026  
**Status:** Resolved

### Incident Summary

A fault in the nightly billing batch run on 12 May caused duplicate renewal charges to be applied to three customer orders. The root cause was the disabled `double_charge_guard` configuration in billing-config.json.

### Affected Orders

- ORD-5501: $19.99 overcharge
- ORD-5502: $19.99 overcharge  
- ORD-5503: $39.98 overcharge

**Total Impact:** $79.96 in duplicate charges

### Remediation Actions

1. **Configuration Verification:** Confirmed `double_charge_guard` was enabled in billing-config.json
2. **Deployment:** Deployed billing-api v3.4.1 to production with guard enabled
3. **Refunds:** Issued full refunds to all three affected customers:
   - amara.osei@fernpost.example: $19.99
   - jonas.beck@quillmail.example: $19.99
   - priya.nair@lumenpost.example: $39.98
4. **Customer Notification:** Notified all three customers of refund issuance
5. **Finance Notification:** Notified finance department with refunds summary

### Verification

- Guard fix verified live in production
- All refunds confirmed issued
- All customers notified
- No further duplicate charges expected

### Closure

All remediation obligations have been met. The duplicate charge guard is now active and will prevent similar incidents in future billing cycles.
