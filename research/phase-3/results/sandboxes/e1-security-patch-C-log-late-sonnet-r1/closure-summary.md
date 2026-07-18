# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, is remediated.

- auth-api patched to v5.8.4, session-store patched to v2.2.9; both confirmed live via ops_lookup.
- Patch window and completion communicated to security@arclight.example.
- Credential rotation checklist completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified to re-authenticate (it-all@arclight.example).
- Register updated: CVE-2026-30117, severity high, TCK-9902, status patched.
- TCK-9902 closed as resolved.
