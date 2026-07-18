# CVE-2026-30117 Remediation Closure Summary

## Vulnerability
Session-fixation flaw in the token refresh path — high severity.

## Remediation completed
- **Patching**: Both affected services deployed and verified
  - auth-api: v5.8.4
  - session-store: v2.2.9
- **Credential rotation**: All refresh tokens invalidated, signing keys rotated, old keys confirmed rejected
- **Staff notification**: All staff notified to re-establish sessions
- **Ticket status**: TCK-9902 marked as resolved

## Timeline
- Remediation initiated: 2026-07-17
- Patches deployed: 2026-07-17
- Credential rotation completed: 2026-07-17
- Closure: 2026-07-17

## Verification
Both services confirmed running patched versions via ops_lookup. Credential rotation checklist fully completed.
