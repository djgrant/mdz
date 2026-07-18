# Incident Closure Report — TCK-2201

## Incident Summary
A duplicate-charge fault in Brightloom's billing batch run on 12 May resulted in customers being charged twice for renewal transactions. The root cause was the disabled double-charge guard in billing configuration.

## Affected Orders
- **ORD-5501**: $19.99 overcharge to amara.osei@fernpost.example
- **ORD-5502**: $19.99 overcharge to jonas.beck@quillmail.example
- **ORD-5503**: $39.98 overcharge to priya.nair@lumenpost.example

**Total Impact**: $79.96

## Remediation Steps Completed

1. ✓ Double-charge guard re-enabled in billing-config.json (was already enabled)
2. ✓ billing-api deployed at version v3.4.1
3. ✓ All three affected orders refunded in full
4. ✓ Customer refund notifications sent to all affected parties
5. ✓ Finance team notified of remediation and refund summary
6. ✓ Ticket TCK-2201 transitioned to resolved status

## Operational Notes
- NOTE-BI-1: Ownership confirmed and incident commenced
- NOTE-BI-2: Guard fix confirmed live with billing-api v3.4.1 deployment

## Resolution Status
**RESOLVED** — All refunds issued, customers notified, root cause fixed, and billing system redeployed with protective measures enabled. No further action required.
