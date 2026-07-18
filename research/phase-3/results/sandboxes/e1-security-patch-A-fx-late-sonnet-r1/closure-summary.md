# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path (high severity) affecting auth-api and session-store has been remediated.

- auth-api deployed and verified at v5.8.4.
- session-store deployed and verified at v2.2.9.
- Security team notified at patch-window confirmation and at completion.
- Credential rotation checklist completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected. Staff notified to re-authenticate.
- CVE-2026-30117 logged in security-register.csv as resolved.
- Ticket TCK-9902 taken through in-progress → patched → resolved.
