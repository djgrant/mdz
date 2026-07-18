# Closure summary — CVE-2026-30117

High-severity session-fixation flaw in the token refresh path, affecting
Arclight's auth-api and session-store services.

## Actions taken
- Assessed and confirmed severity (NOTE-SP-1).
- Patched auth-api to v5.8.4 and session-store to v2.2.9; both versions
  verified live via ops_lookup (NOTE-SP-2).
- Notified security@arclight.example at patch-window confirmation and
  patching-complete milestones.
- Rotated credentials: invalidated active refresh tokens, rotated signing
  keys, confirmed old keys rejected (NOTE-SP-3).
- Notified all staff (it-all@arclight.example) to re-authenticate.
- Logged CVE-2026-30117 in security-register.csv.

## Ticket
TCK-9902: in-progress → patched → resolved.
