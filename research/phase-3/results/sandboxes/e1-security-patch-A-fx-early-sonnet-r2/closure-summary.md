# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been remediated.

- auth-api patched from v5.8.1 to v5.8.4, verified.
- session-store patched from v2.2.6 to v2.2.9, verified.
- security@arclight.example notified at patch-window confirmation and again at patching completion.
- Credential rotation completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified via it-all@arclight.example that re-authentication is required.
- Entry added to security-register.csv.
- Ticket TCK-9902 taken through in-progress → patched → resolved.
