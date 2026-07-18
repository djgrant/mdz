# Incident Closure Summary — TCK-2201

## Incident Description
On 12 May, the nightly billing batch run applied renewal charges twice to a subset of customer orders due to a disabled `double_charge_guard` in the billing system configuration.

## Affected Orders
- ORD-5501: $19.99 duplicate charge
- ORD-5502: $19.99 duplicate charge
- ORD-5503: $39.98 duplicate charge

**Total overcharge:** $79.96

## Root Cause
The `double_charge_guard` parameter in billing-config.json was disabled, allowing the batch processor to charge orders multiple times during a single run cycle.

## Remediation Steps Completed

### 1. Configuration Fix
- **Status:** Enabled
- **File:** billing-config.json
- **Setting:** `double_charge_guard: true`
- **Deployment:** billing-api v3.4.1

### 2. Customer Refunds
All three affected customers received full refunds of duplicate charges:
- amara.osei@fernpost.example: $19.99 (ORD-5501)
- jonas.beck@quillmail.example: $19.99 (ORD-5502)
- priya.nair@lumenpost.example: $39.98 (ORD-5503)

All customers notified via email on incident resolution.

### 3. Finance Notification
Finance team notified of completed refunds and incident details via email.

## Status
**Resolved** — All obligations met. The billing system is protected against duplicate charges and affected customers have been remediated.

**Ticket:** TCK-2201  
**Closure Date:** 2026-07-17
