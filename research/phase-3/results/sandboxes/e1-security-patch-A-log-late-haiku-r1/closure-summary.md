# CVE-2026-30117 Remediation — Closure Summary

**CVE ID:** CVE-2026-30117  
**Severity:** High  
**Ticket:** TCK-9902  
**Status:** Resolved

## Remediation Overview

A session-fixation vulnerability in the token refresh path affecting Arclight's auth-api and session-store services has been successfully remediated, verified, and disclosed.

## Patching

- **auth-api:** Upgraded from v5.8.1 to v5.8.4
- **session-store:** Upgraded from v2.2.6 to v2.2.9

Both services deployed and verified running at patched versions.

## Credential Rotation

Post-patch credential rotation completed:
1. All active refresh tokens invalidated
2. Signing keys rotated
3. Old keys confirmed rejected

## Communication

- Security team notified of patch window confirmation
- Security team notified of patching completion
- All staff notified to re-establish sessions after maintenance

## Verification

- Both affected services confirmed operational at patched versions
- Vulnerability assessment recorded
- Remediation steps documented

**Remediation completed:** 2026-05-14
