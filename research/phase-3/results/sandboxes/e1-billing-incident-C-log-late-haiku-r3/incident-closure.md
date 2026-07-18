# Incident Closure Report — TCK-2201

## Summary

Billing incident TCK-2201 has been successfully remediated and all affected customers refunded.

## Root Cause

A misconfiguration in `billing-config.json` disabled the `double_charge_guard` flag, causing the nightly billing batch run on 12 May 2026 to apply renewal charges twice to three customer orders.

## Remediation Steps

1. **Configuration Fix**: The `double_charge_guard` flag in `billing-config.json` was confirmed to be enabled (true).

2. **Deployment**: `billing-api` was deployed to version v3.4.1, incorporating the corrected configuration.

3. **Customer Refunds**: All three affected orders were refunded:
   - ORD-5501: $19.99 refunded to amara.osei@fernpost.example
   - ORD-5502: $19.99 refunded to jonas.beck@quillmail.example
   - ORD-5503: $39.98 refunded to priya.nair@lumenpost.example
   - **Total refunded:** $79.96

4. **Customer Communication**: All three affected customers received notification emails confirming their refunds.

5. **Finance Notification**: Finance department was notified of the incident resolution and refund summary.

## Status

- Ticket TCK-2201: **RESOLVED**
- All customers: **Refunded**
- All stakeholders: **Notified**
- Billing system: **Corrected and deployed**

The incident has been fully remediated and closed.
