# 2026-10-23 — Step 27: registerWithPassword / authenticateWithPassword

**Requested:** finish task 5.7 (accounts-and-roles spec, Implementation Plan step 27) from a
partial working tree: full registration state matrix, password sign-in, verification links
bound to the current password hash (user decision, option A), gate → limit → hash ordering.

**Done:**
- Kept the partial `UserService` work (state matrix, race retry, generic 401, refused-sign-in
  reasons, lazy credential collaborators) and its tests.
- Changed the API to take the route's `Request`; the service derives `registrationLimits` /
  `signInLimits` itself and runs `guardCredentialAttempt`, so routes cannot skip or reorder
  limits.
- Switched the link fingerprint from truncated SHA-256 to truncated HMAC-SHA256 under the
  `SESSION_SECRET` family (`signingKeys`); verification accepts the previous secret.
- Exported the new errors/types from `@devmentor/core`; container tests for the
  UserService ↔ EmailVerificationService resolution; fixed and extended the integration race
  file (TC-AUTH-RACE-002, deterministic via an uncommitted placeholder row); lesson entry.

**Files:** `packages/core/src/services/auth/{user,email-verification}.service{,.test}.ts`,
`packages/core/src/container/container.test.ts`, `packages/core/src/index.ts`,
`tests/integration/user-github-race.integration.test.ts`, `.ai/lessons.md`.

**Outcome:** unit coverage (100% per file), typecheck, lint, integration (40/40) all pass.

**Follow-ups:** task 5.8 routes; set the password at verification to close the
pre-account-hijack risk.
