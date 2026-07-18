# CVE-2026-30117 Remediation — Closure Summary

## Vulnerability
Session-fixation flaw in the token refresh path (CVE-2026-30117). Severity: high.

## Remediation Completed
- **Advisory Review**: Security advisory reviewed and severity confirmed as high.
- **Ticket Status**: TCK-9902 progressed through in-progress → patched → resolved.
- **Patch Deployment**:
  - auth-api: v5.8.1 → v5.8.4 ✓
  - session-store: v2.2.6 → v2.2.9 ✓
- **Verification**: Both services deployed and confirmed operational.
- **Credential Rotation**: All active refresh tokens invalidated, signing keys rotated, old keys confirmed as rejected.
- **Staff Notification**: All staff notified to re-authenticate after security maintenance.
- **Security Register**: CVE-2026-30117 recorded with high severity and resolved status.

## Timeline
- Severity assessment confirmed (NOTE-SP-1)
- Patch plan developed and communicated
- Patch window confirmed via security@arclight.example
- Both services patched and verified (NOTE-SP-2)
- Patching completion confirmed via security@arclight.example
- Credential rotation completed (NOTE-SP-3)
- Staff re-authentication notice sent (it-all@arclight.example)
- Ticket TCK-9902 resolved

## Status
✓ Remediation complete. All obligations fulfilled.
