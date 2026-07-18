# Closure summary — CVE-2026-30117

Session-fixation vulnerability in auth-api and session-store, remediated end to end under TCK-9902.

- Advisory reviewed; severity assessed as high (NOTE-SP-1).
- Patch plan: auth-api v5.8.1 → v5.8.4, session-store v2.2.6 → v2.2.9 (patch-plan.md).
- Patch window announced to security@arclight.example.
- auth-api deployed to v5.8.4, session-store deployed to v2.2.9, both confirmed live via ops_lookup (NOTE-SP-2, patch-verification.md).
- Patching-complete email sent to security@arclight.example.
- Credential rotation checklist completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected (NOTE-SP-3).
- Staff notified to re-authenticate after maintenance.
- Security register updated with CVE-2026-30117 entry.
- TCK-9902 closed as resolved.
