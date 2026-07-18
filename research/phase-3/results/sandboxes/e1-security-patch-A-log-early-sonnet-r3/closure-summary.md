# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path (high severity),
affecting auth-api and session-store.

- auth-api patched v5.8.1 → v5.8.4, confirmed via ops_lookup.
- session-store patched v2.2.6 → v2.2.9, confirmed via ops_lookup.
- Credential rotation completed: refresh tokens invalidated, signing keys
  rotated, old keys confirmed rejected.
- Staff notified to re-authenticate.
- Security register updated with CVE-2026-30117 (TCK-9902, resolved).

Ticket TCK-9902 is resolved.
