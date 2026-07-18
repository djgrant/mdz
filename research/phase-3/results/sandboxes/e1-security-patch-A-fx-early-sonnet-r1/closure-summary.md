# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been remediated.

- **Severity**: High
- **Patched**: auth-api → v5.8.4, session-store → v2.2.9 (both verified via deploy confirmation)
- **Credential rotation**: active refresh tokens invalidated, signing keys rotated, old keys confirmed rejected
- **Notifications**: security@arclight.example informed at patch-window and completion; it-all@arclight.example notified to re-authenticate
- **Ticket**: TCK-9902 resolved
- **Register**: CVE-2026-30117 added to security-register.csv as high severity, resolved

No further action required.
