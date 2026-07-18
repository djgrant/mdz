# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been remediated.

- **Severity:** High
- **Ticket:** TCK-9902 (resolved)
- **Patched:** auth-api v5.8.1 → v5.8.4, session-store v2.2.6 → v2.2.9
- **Verified:** both services confirmed running patched versions via ops_lookup
- **Credential rotation:** refresh tokens invalidated, signing keys rotated, old keys confirmed rejected
- **Notifications sent:** security@arclight.example (patch window confirmed, patching complete), it-all@arclight.example (re-authentication notice)
- **Register:** CVE-2026-30117 added to security-register.csv
