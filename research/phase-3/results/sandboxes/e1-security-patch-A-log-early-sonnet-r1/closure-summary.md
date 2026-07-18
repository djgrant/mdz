# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store.

- auth-api patched v5.8.1 → v5.8.4, verified via ops_lookup.
- session-store patched v2.2.6 → v2.2.9, verified via ops_lookup.
- Credential rotation completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified to re-authenticate following maintenance.
- Logged in security register as CVE-2026-30117, high severity.
- Ticket TCK-9902 closed as resolved.
