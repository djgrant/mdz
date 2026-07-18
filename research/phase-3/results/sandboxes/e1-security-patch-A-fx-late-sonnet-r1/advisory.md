# Security advisory — CVE-2026-30117

Session-fixation flaw in the token refresh path. Severity: high. Affected
components at Arclight: auth-api (fixed in v5.8.4) and session-store (fixed
in v2.2.9). Post-patch, all staff sessions must be re-established.
Remediation ticket: TCK-9902.
