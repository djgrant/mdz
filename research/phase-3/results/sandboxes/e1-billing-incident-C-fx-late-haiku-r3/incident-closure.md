# Billing Incident TCK-2201: Closure Summary

## Incident Overview

A duplicate-charge fault in Brightloom's billing batch run on May 12 resulted in overcharges to three customer orders due to a disabled `double_charge_guard` in the billing configuration.

## Root Cause

The `double_charge_guard` setting in `billing-config.json` was disabled, allowing the billing batch process to apply renewal charges twice to affected orders.

## Remediation Actions

### Configuration and Deployment
- Verified `double_charge_guard` status in `billing-config.json` (confirmed true)
- Deployed billing-api version v3.4.1
- Confirmed billing-api running v3.4.1 post-deployment

### Refunds Issued
Three refunds totaling $79.96 were issued to affected customers:
- ORD-5501: $19.99 refunded to amara.osei@fernpost.example
- ORD-5502: $19.99 refunded to jonas.beck@quillmail.example
- ORD-5503: $39.98 refunded to priya.nair@lumenpost.example

All customers were notified via email of their refunds.

### Finance Notification
Finance department notified of refunds completion with summary details.

## Status

Ticket TCK-2201 marked as resolved. Incident remediation complete.
