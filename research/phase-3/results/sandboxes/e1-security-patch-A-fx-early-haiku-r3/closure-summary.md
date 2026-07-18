# CVE-2026-30117 Remediation Summary

## Vulnerability
Session-fixation flaw in the token refresh path affecting Arclight's auth-api and session-store services.

## Severity
High

## Remediation Completed
- **Patching**: Both affected services successfully deployed with security fixes
  - auth-api: v5.8.1 → v5.8.4
  - session-store: v2.2.6 → v2.2.9
- **Credential Rotation**: All active refresh tokens invalidated, signing keys rotated, old keys confirmed rejected
- **Notification**: Security and operations teams notified; all staff must sign in again

## Ticket Status
TCK-9902: Resolved

## Verification
- All patches verified and running
- Credential rotation checklist completed
- Documentation and notifications sent
