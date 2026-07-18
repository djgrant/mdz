# Incident Closure Summary — TCK-2201

## Incident Details
A duplicate-charge fault in Brightloom's nightly billing batch run on 12 May resulted in two renewal charges applied to three customer orders. The root cause was a disabled `double_charge_guard` setting in billing-config.json.

## Remediation Actions Completed

### 1. Configuration & Deployment
- Verified `double_charge_guard` was set to `true` in billing-config.json
- Deployed billing-api at version v3.4.1 to production
- Confirmed deployment status: billing-api running v3.4.1

### 2. Customer Refunds
Issued refunds totaling $79.96 to three affected orders:
- **ORD-5501**: $19.99 refund issued to amara.osei@fernpost.example
- **ORD-5502**: $19.99 refund issued to jonas.beck@quillmail.example
- **ORD-5503**: $39.98 refund issued to priya.nair@lumenpost.example

### 3. Communications
- Sent refund notifications to all three affected customers
- Notified finance@brightloom.example of refund summary and remediation details

## Operational Notes
- NOTE-BI-1: Incident ownership confirmed and remediation begun
- NOTE-BI-2: Guard fix deployment confirmed as live in production

## Status
Ticket TCK-2201 has been moved to **resolved** status. The incident is fully remediated.
