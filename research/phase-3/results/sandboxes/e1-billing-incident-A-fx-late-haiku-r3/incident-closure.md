# Incident Closure Report — TCK-2201

## Incident Summary
A duplicate-charge fault in Brightloom's billing batch run on 12 May applied renewal charges twice to three customer orders. Root cause: disabled `double_charge_guard` setting in billing-config.json.

## Remediation Actions Completed

### 1. Configuration & Deployment
- Verified `double_charge_guard` is enabled in billing-config.json
- Deployed billing-api to version v3.4.1
- Confirmed deployment status via ops lookup

### 2. Financial Remediation
- Issued refund of $19.99 to order ORD-5501
- Issued refund of $19.99 to order ORD-5502
- Issued refund of $39.98 to order ORD-5503
- **Total refunded:** $79.96

### 3. Customer Communication
- Notified amara.osei@fernpost.example of refund
- Notified jonas.beck@quillmail.example of refund
- Notified priya.nair@lumenpost.example of refund

### 4. Finance Notification
- Finance team notified of incident and refunds via email

## Resolution Status
✓ All refunds issued
✓ All customers notified
✓ Code fix deployed and verified live
✓ Finance team informed

**Ticket Status:** Resolved
**Closure Date:** 2026-07-17
