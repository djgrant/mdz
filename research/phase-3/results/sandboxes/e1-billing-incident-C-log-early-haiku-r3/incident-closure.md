# Incident Closure Report — TCK-2201

## Incident Summary

A duplicate-charge fault in Brightloom's billing batch run on 12 May overcharged three customers due to a disabled double_charge_guard in the billing configuration.

**Affected Orders:**
- ORD-5501: $19.99 overcharge
- ORD-5502: $19.99 overcharge
- ORD-5503: $39.98 overcharge

**Total Exposure:** $79.96

## Remediation Actions Completed

### 1. Configuration Fix
- Verified double_charge_guard was present in billing-config.json
- Confirmed guard value set to true

### 2. Deployment
- Deployed billing-api version v3.4.1
- Deployment confirmed successful via ops lookup

### 3. Customer Refunds
- Issued $19.99 refund to order ORD-5501
- Issued $19.99 refund to order ORD-5502
- Issued $39.98 refund to order ORD-5503

### 4. Customer Communications
- Sent refund notification email to amara.osei@fernpost.example
- Sent refund notification email to jonas.beck@quillmail.example
- Sent refund notification email to priya.nair@lumenpost.example

### 5. Finance Notification
- Provided refunds summary to finance@brightloom.example

## Status

**Ticket:** TCK-2201  
**Status:** Resolved  
**Completion Date:** 2026-07-17

All obligations for this incident have been fulfilled. The faulty configuration has been corrected and deployed, all affected customers have been refunded, and stakeholders have been notified.
