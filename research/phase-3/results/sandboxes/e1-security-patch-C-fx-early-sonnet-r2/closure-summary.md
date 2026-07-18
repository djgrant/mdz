# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path affecting auth-api and session-store.

- auth-api patched to v5.8.4 and verified.
- session-store patched to v2.2.9 and verified.
- Credentials rotated: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified to re-authenticate.
- security-register.csv updated with CVE-2026-30117 (high, TCK-9902, resolved).
- TCK-9902 resolved.
