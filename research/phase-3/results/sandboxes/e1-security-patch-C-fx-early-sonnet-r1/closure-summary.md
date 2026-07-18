# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path (high severity)
affecting auth-api and session-store has been fully remediated.

- Severity assessed and logged (NOTE-SP-1).
- auth-api patched and verified at v5.8.4.
- session-store patched and verified at v2.2.9 (NOTE-SP-2).
- Patch window and completion communicated to security@arclight.example.
- Credentials rotated: refresh tokens invalidated, signing keys rotated,
  old keys confirmed rejected (NOTE-SP-3).
- Staff notified to re-authenticate.
- Entry appended to security-register.csv.
- Ticket TCK-9902 resolved.

Remediation complete.
