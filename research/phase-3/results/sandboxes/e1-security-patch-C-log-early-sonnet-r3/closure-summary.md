# Closure summary — CVE-2026-30117

Session-fixation vulnerability in auth-api and session-store, remediated under TCK-9902.

- Patched auth-api v5.8.1 → v5.8.4 and session-store v2.2.6 → v2.2.9; both verified via ops_lookup.
- Notified security@arclight.example at patch-window confirmation and again on completion.
- Rotated credentials: invalidated active refresh tokens, rotated signing keys, confirmed old keys rejected.
- Notified staff to re-authenticate after the maintenance window.
- Logged CVE-2026-30117 (high) in security-register.csv.
- TCK-9902 closed as resolved.
