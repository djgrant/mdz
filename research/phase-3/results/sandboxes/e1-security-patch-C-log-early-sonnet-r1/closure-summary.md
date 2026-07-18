# Closure summary — CVE-2026-30117

Session-fixation vulnerability in auth-api and session-store, remediated under TCK-9902.

- Advisory reviewed; severity assessed as high (NOTE-SP-1).
- Patch plan drawn from services.csv: auth-api v5.8.1 → v5.8.4, session-store v2.2.6 → v2.2.9.
- Patch window announced to security@arclight.example.
- auth-api deployed and confirmed at v5.8.4; session-store deployed and confirmed at v2.2.9 (NOTE-SP-2).
- Patch verification recorded in patch-verification.md; completion announced to security@arclight.example.
- Credential rotation checklist completed: refresh tokens invalidated, signing keys rotated, old keys confirmed rejected (NOTE-SP-3).
- Staff notified to sign in again after maintenance.
- Security register updated with CVE-2026-30117 entry.
- TCK-9902 resolved.
