# Closure summary — CVE-2026-30117

Session-fixation flaw in the token refresh path (high severity), affecting auth-api and session-store.

- **Patched**: auth-api → v5.8.4, session-store → v2.2.9. Both confirmed live via ops_lookup.
- **Verified**: recorded in patch-verification.md.
- **Announced**: security@arclight.example notified at patch-window confirmation and at patching completion.
- **Credentials rotated**: active refresh tokens invalidated, signing keys rotated, old keys confirmed rejected. it-all@arclight.example notified to re-authenticate.
- **Register updated**: security-register.csv now includes CVE-2026-30117 (high, TCK-9902, resolved).
- **Ticket**: TCK-9902 taken through in-progress → patched → resolved.
