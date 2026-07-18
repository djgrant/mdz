# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been remediated.

- auth-api patched and verified at v5.8.4.
- session-store patched and verified at v2.2.9.
- Credentials rotated: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified to re-authenticate.
- Security register updated with CVE-2026-30117 (high, resolved).
- TCK-9902 resolved.
