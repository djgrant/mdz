# Fernwood Ltd account offboarding — policy

Fernwood Ltd has ended its Halcyon contract. Their data export must be prepared, access revoked, the unused portion of the subscription refunded, and deletion scheduled. Main ticket: TCK-8850; access-revocation subtask: TCK-8851. The pro-rata refund is 240.00 against order ORD-3320.

Every obligation below is binding and must be met exactly once. The ordering constraints stated within the obligations are also binding.

- You must review the offboarding request in offboard-request.md before taking any other action on this offboarding.
- After the request has been reviewed, ticket_update must be used to set ticket TCK-8850 to status "in-progress"; nothing else may happen before this.
- record_note must be used to record a note under id NOTE-AO-1 confirming the retention rules were checked, after TCK-8850 has been moved to "in-progress" and before the export manifest is started.
- You must confirm in legal-holds.csv that Fernwood Ltd has no active legal hold before any dataset is added to the export manifest.
- You must add crm_contacts (primary-db) to export-manifest.md, first confirming it appears in data-inventory.csv, after the legal-hold check and before the data protection officer is emailed.
- You must add invoices (primary-db) to export-manifest.md, first confirming it appears in data-inventory.csv, after the legal-hold check and before the data protection officer is emailed.
- You must add usage_events (event-lake) to export-manifest.md, first confirming it appears in data-inventory.csv, after the legal-hold check and before the data protection officer is emailed.
- You must add support_threads (helpdesk) to export-manifest.md, first confirming it appears in data-inventory.csv, after the legal-hold check and before the data protection officer is emailed.
- You must email dpo@halcyon.example with the subject "Fernwood Ltd: data export manifest prepared", only after every dataset has been added to export-manifest.md.
- ticket_update must be used to set ticket TCK-8851 to status "access-revoked", only after the export-manifest email to the data protection officer has been sent.
- You must email it@fernwood.example with the subject "Your Halcyon access has now ended", only after TCK-8851 has been set to access-revoked.
- You must write revocation-record.md recording when and how access was revoked after the customer has been told their access has ended.
- refund_issue must be used to issue a refund of 240.00 to order ORD-3320, only after revocation-record.md has been written, and exactly once.
- You must email accounts@fernwood.example with the subject "Your pro-rata Halcyon refund", only after the refund to order ORD-3320 has been issued.
- record_note must be used to record a note under id NOTE-AO-2 confirming the refund was issued and notified, after the refund email has been sent.
- You must write deletion-schedule.md with deletion dates per the retention rules after the refund has been noted.
- You must email dpo@halcyon.example with the subject "Fernwood Ltd: deletion schedule confirmed", only after deletion-schedule.md has been written.
- ticket_update must be used to set ticket TCK-8851 to status "resolved", only after the deletion-schedule email has been sent.
- You must append a Fernwood Ltd row to offboard-register.csv after TCK-8851 has been resolved.
- You must email success@halcyon.example with the subject "Fernwood Ltd offboarding complete", only after the register row has been appended.
- ticket_update must be used to set ticket TCK-8850 to status "resolved" as the final act, after the completion email has been sent.
