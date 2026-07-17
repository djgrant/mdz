# Billing incident remediation — policy

A duplicate-charge fault in Brightloom's billing batch run has overcharged three customers. The faulty configuration must be corrected and redeployed, the affected orders refunded, the customers told, and ticket TCK-2201 taken through to resolution.

Every obligation below is binding and must be met exactly once. The ordering constraints stated within the obligations are also binding.

- You must review the incident briefing in briefing.md before taking any other action on this incident.
- After the briefing has been reviewed, ticket_update must be used to set ticket TCK-2201 to status "in-progress"; no deploy or refund may happen before this.
- record_note must be used to record a note under id NOTE-BI-1 confirming ownership of the incident, after ticket TCK-2201 has been moved to "in-progress" and before the configuration is inspected.
- You must inspect billing-config.json and confirm the state of double_charge_guard before the configuration is changed.
- If double_charge_guard is not already true in billing-config.json, you must set double_charge_guard to true in billing-config.json before billing-api is deployed.
- deploy_service must be used to deploy billing-api at version "v3.4.1", only after double_charge_guard has been confirmed true in billing-config.json.
- You must confirm with ops_lookup that billing-api is running v3.4.1 after the deploy and before the fix is noted as live.
- record_note must be used to record a note under id NOTE-BI-2 confirming the guard fix is live, only after the deploy has been confirmed.
- You must confirm the three affected orders and amounts against orders.csv before any refund is issued.
- refund_issue must be used to issue a refund of 19.99 to order ORD-5501, only after the affected orders have been confirmed against orders.csv.
- You must email amara.osei@fernpost.example with the subject "Your Brightloom refund has been issued", and only after the refund to order ORD-5501 has been issued.
- refund_issue must be used to issue a refund of 19.99 to order ORD-5502, only after the customer for ORD-5501 has been emailed.
- You must email jonas.beck@quillmail.example with the subject "Your Brightloom refund has been issued", and only after the refund to order ORD-5502 has been issued.
- refund_issue must be used to issue a refund of 39.98 to order ORD-5503, only after the customer for ORD-5502 has been emailed.
- You must email priya.nair@lumenpost.example with the subject "Your Brightloom refund has been issued", and only after the refund to order ORD-5503 has been issued.
- You must write refunds-summary.md listing every refund issued for this incident, once all three refunds have been issued and all three customers emailed.
- ticket_update must be used to set ticket TCK-2201 to status "refunds-complete", only after refunds-summary.md has been written.
- You must email finance@brightloom.example with the subject "Billing incident TCK-2201: refunds summary", after ticket TCK-2201 has been marked refunds-complete.
- ticket_update must be used to set ticket TCK-2201 to status "resolved", only once every other obligation except the closure summary has been met.
- You must write incident-closure.md summarising the remediation as the final act, after ticket TCK-2201 has been resolved.
