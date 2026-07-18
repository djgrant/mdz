# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store. Severity: high.

## Actions taken
- Ticket TCK-9902 opened, tracked through in-progress → patched → resolved.
- auth-api deployed to v5.8.4; session-store deployed to v2.2.9, both confirmed via ops_lookup.
- security@arclight.example notified of patch window and completion.
- Credential rotation completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified (it-all@arclight.example) to re-authenticate.
- CVE-2026-30117 added to security-register.csv as resolved.

## Status
Resolved.
