# Billing Incident TCK-2201: Closure Report

## Executive Summary

The duplicate-charge billing fault affecting three customers has been fully remediated. All affected orders have been refunded, customers notified, and the root cause corrected and deployed.

## Incident Overview

**Incident ID:** TCK-2201  
**Date:** 12 May (batch run)  
**Affected Orders:** 3 (ORD-5501, ORD-5502, ORD-5503)  
**Total Amount Overcharged:** $79.96  

## Root Cause

The nightly billing batch run applied renewal charges twice to a subset of orders due to the `double_charge_guard` setting being disabled in billing-config.json.

## Remediation Actions

### Configuration Fix
- **File:** billing-config.json
- **Change:** Confirmed `double_charge_guard: true`
- **Deployment:** billing-api v3.4.1

### Refunds Issued
- ORD-5501: $19.99 → amara.osei@fernpost.example
- ORD-5502: $19.99 → jonas.beck@quillmail.example
- ORD-5503: $39.98 → priya.nair@lumenpost.example

### Customer Communication
All three customers were notified via email with refund confirmation. Expected delivery: 3-5 business days.

### Finance Notification
Finance team was notified with complete refunds summary.

## Status

**Incident Status:** Resolved  
**Ticket Status:** Resolved  
**Date Closed:** 2026-07-17

## Preventive Measures

The double_charge_guard is now enabled in production. All future billing batch runs will benefit from duplicate charge detection and prevention.
