# Closure summary — CVE-2026-30117

Session-fixation vulnerability in the token refresh path, affecting auth-api and session-store, has been fully remediated.

- Patched auth-api to v5.8.4 and session-store to v2.2.9; both versions confirmed via ops_lookup (see patch-verification.md).
- Security advisory reviewed, patch plan documented (patch-plan.md), and security@arclight.example notified before and after the patch window.
- Credential rotation checklist completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected.
- Staff notified to re-authenticate following the maintenance.
- CVE-2026-30117 logged in security-register.csv.
- Ticket TCK-9902 taken through in-progress → patched → resolved.
