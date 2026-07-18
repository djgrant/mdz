# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been remediated.

- **Patched**: auth-api v5.8.1 → v5.8.4; session-store v2.2.6 → v2.2.9. Both confirmed live via ops_lookup.
- **Notified**: security@arclight.example on patch-window confirmation and again on patching completion.
- **Credentials rotated**: active refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- **Staff notified**: all-staff email sent asking users to sign in again following session invalidation.
- **Register**: CVE-2026-30117 (high) logged in security-register.csv against TCK-9902, status resolved.
- **Ticket**: TCK-9902 taken through in-progress → patched → resolved.

No further action required.
