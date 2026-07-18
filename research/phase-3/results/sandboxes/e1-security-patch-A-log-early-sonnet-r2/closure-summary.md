# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store.

- auth-api patched to v5.8.4; session-store patched to v2.2.9. Both versions confirmed live via ops_lookup.
- Security team notified at patch-window confirmation and again at patch completion.
- Credential rotation completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected. Staff notified to re-authenticate.
- Entry added to security-register.csv.
- Ticket TCK-9902 taken from in-progress → patched → resolved.
