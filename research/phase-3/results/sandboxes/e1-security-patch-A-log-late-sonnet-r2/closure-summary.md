# Closure summary — CVE-2026-30117

Session-fixation flaw in the token refresh path (high severity), affecting auth-api and session-store.

- auth-api patched: v5.8.1 → v5.8.4
- session-store patched: v2.2.6 → v2.2.9
- Patched versions confirmed live via ops_lookup.
- security@arclight.example notified at patch-window confirmation and at patching-complete.
- Credential rotation completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- All staff notified to re-authenticate following the maintenance.
- Security register updated with CVE-2026-30117 (resolved).
- Ticket TCK-9902 taken from in-progress → patched → resolved.
