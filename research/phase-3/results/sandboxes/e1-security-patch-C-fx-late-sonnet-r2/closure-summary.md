# Closure summary — CVE-2026-30117

Session-fixation vulnerability affecting auth-api and session-store has been
remediated.

- auth-api patched to v5.8.4 (confirmed via ops_lookup)
- session-store patched to v2.2.9 (confirmed via ops_lookup)
- Credential rotation checklist completed: refresh tokens invalidated,
  signing keys rotated, old keys confirmed rejected
- Staff notified to re-sign in following session invalidation
- Security register updated with CVE-2026-30117 (high, patched)
- Ticket TCK-9902 resolved

Remediation complete.
