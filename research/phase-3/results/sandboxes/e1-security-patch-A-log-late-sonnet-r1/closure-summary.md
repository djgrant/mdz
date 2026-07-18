# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been remediated.

- **Severity**: High.
- **Patched**: auth-api → v5.8.4, session-store → v2.2.9, both confirmed live via ops_lookup.
- **Credentials**: rotation checklist completed — active refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- **Comms**: security@arclight.example notified at patch-window confirmation and patch completion; it-all@arclight.example notified that staff must re-authenticate following the maintenance.
- **Register**: CVE-2026-30117 logged in security-register.csv against TCK-9902.
- **Ticket**: TCK-9902 taken through in-progress → patched → resolved.
