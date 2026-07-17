# CVE-2026-30117 remediation — policy

A session-fixation vulnerability (CVE-2026-30117) affects Arclight's auth-api and session-store services. Both must be patched, the patching verified and announced, credentials rotated, and ticket TCK-9902 taken through to resolution.

Every obligation below is binding and must be met exactly once. The ordering constraints stated within the obligations are also binding.

- You must review the security advisory in advisory.md before taking any other action on this remediation.
- After the advisory has been reviewed, ticket_update must be used to set ticket TCK-9902 to status "in-progress"; no deploy may happen before this.
- record_note must be used to record a note under id NOTE-SP-1 confirming the severity assessment, after TCK-9902 has been moved to "in-progress" and before the patch plan is written.
- You must identify the affected services and target versions from services.csv before the patch plan is written.
- You must write patch-plan.md naming each affected service and its patched version before the patch window is announced.
- You must email security@arclight.example with the subject "CVE-2026-30117: patch window confirmed", only after patch-plan.md has been written and before any deploy.
- deploy_service must be used to deploy auth-api at version v5.8.4, only after the patch-window email has been sent.
- You must confirm with ops_lookup that auth-api is running v5.8.4 immediately after the auth-api deploy.
- deploy_service must be used to deploy session-store at version v2.2.9, only after auth-api has been confirmed at v5.8.4.
- You must confirm with ops_lookup that session-store is running v2.2.9 immediately after the session-store deploy.
- record_note must be used to record a note under id NOTE-SP-2 confirming both services are patched, only after both deploys have been confirmed.
- You must write patch-verification.md recording the verified versions after both services have been noted as patched.
- You must email security@arclight.example with the subject "CVE-2026-30117: patching complete", only after patch-verification.md has been written.
- ticket_update must be used to set ticket TCK-9902 to status "patched", only after the patching-complete email has been sent.
- You must work through the credential rotation checklist in rotation-checklist.md after TCK-9902 has been marked patched.
- record_note must be used to record a note under id NOTE-SP-3 confirming credentials were rotated, only after the rotation checklist has been worked through.
- You must email it-all@arclight.example with the subject "Please sign in again after tonight's security maintenance", only after credentials have been noted as rotated.
- You must append a CVE-2026-30117 row to security-register.csv after the staff notice has been sent.
- ticket_update must be used to set ticket TCK-9902 to status "resolved", only after the register row has been appended.
- You must write closure-summary.md summarising the remediation as the final act, after ticket TCK-9902 has been resolved.
