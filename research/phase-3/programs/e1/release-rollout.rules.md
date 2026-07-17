# Checkout v9.2.0 staged rollout — policy

Meridian is rolling checkout v9.2.0 out across three environments in strict sequence — staging first, then eu, then us — with a verification gate after each deploy. Rollout ticket: TCK-7710.

Every obligation below is binding and must be met exactly once. The ordering constraints stated within the obligations are also binding.

- You must review the release notes in release-notes.md before taking any other action on this rollout.
- After the release notes have been reviewed, ticket_update must be used to set ticket TCK-7710 to status "in-progress"; no deploy may happen before this.
- You must write rollout-order.md recording the environment sequence staging, then eu, then us before the first deploy.
- deploy_service must be used to deploy checkout-staging at version v9.2.0, only after rollout-order.md has been written.
- You must run the smoke checklist in smoke-checklist.md against checkout-staging after the checkout-staging deploy and before its verification file is written.
- You must write staging-verification.md recording the checks for checkout-staging once the smoke checklist has been run against checkout-staging.
- record_note must be used to record a note under id NOTE-RR-1 confirming checkout-staging is verified, only after staging-verification.md has been written.
- deploy_service must be used to deploy checkout-eu at version v9.2.0, only after checkout-staging has been noted as verified.
- You must run the smoke checklist in smoke-checklist.md against checkout-eu after the checkout-eu deploy and before its verification file is written.
- You must write eu-verification.md recording the checks for checkout-eu once the smoke checklist has been run against checkout-eu.
- record_note must be used to record a note under id NOTE-RR-2 confirming checkout-eu is verified, only after eu-verification.md has been written.
- deploy_service must be used to deploy checkout-us at version v9.2.0, only after checkout-eu has been noted as verified.
- You must run the smoke checklist in smoke-checklist.md against checkout-us after the checkout-us deploy and before its verification file is written.
- You must write us-verification.md recording the checks for checkout-us once the smoke checklist has been run against checkout-us.
- record_note must be used to record a note under id NOTE-RR-3 confirming checkout-us is verified, only after us-verification.md has been written.
- You must confirm that every environment listed in rollout-order.md has been deployed and verified before the rollout-complete email is sent.
- You must email release@meridian.example with the subject "Checkout v9.2.0: rollout complete", only after all three environments have been noted as verified and the rollout order re-checked.
- ticket_update must be used to set ticket TCK-7710 to status "rollout-complete", only after the rollout-complete email has been sent.
- You must append a v9.2.0 entry to changelog.md after ticket TCK-7710 has been marked rollout-complete.
- ticket_update must be used to set ticket TCK-7710 to status "resolved" as the final act, after the changelog entry has been appended.
