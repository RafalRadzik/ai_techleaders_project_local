# Accounts review remediation

Date: 2026-10-26
Status: active
Supersedes: the email-verification credential activation and automatic GET sign-in
behavior in `implemented/2026-09-04-accounts-and-roles.md`. Other E01 contracts remain.

## Problem and goal

The branch review found credential activation by unsolicited verification links,
unsafe normalized return paths, missing verification-mail limits, and page failures
without recoverable database-unavailable UI. Fix these without weakening authorization
or changing unrelated behavior.

## Decisions approved by the user

- The inbox owner sets the final password after opening the verification link.
  GET must no longer activate or sign in an account. Existing emailed links still
  open the new completion screen.
- Always enforce three verification mails per email per hour. When a trusted client
  IP cannot be derived, use the email limit and existing hashing concurrency gate;
  do not invent an IP, impose a shared global cap, or require a proxy.
- Work stays local; no commits, pushes, tracker writes, or publication.

## Approach

1. Keep registration's initial stored credential as an unverified claim marker and
   preserve the existing registration request contract. Following the email link
   opens a password-completion form. A CSRF-protected JSON POST validates the link
   and password, replaces the claim password with the inbox owner's chosen password,
   marks the email verified, bumps the session version, and issues a session.
   Verification and credential changes are atomic under the same user-row lock as
   registration. Consumed/superseded links cannot reset a verified account or issue
   another session. Passwords/hashes never enter URLs, DTOs, or logs.
2. Keep the existing email-link URL and purpose-token format so outstanding links
   reach completion. Document the intentional security correction: GET no longer
   verifies/signs in, and completion requires a password. Do not preserve an insecure
   compatibility bridge. Keep API error envelopes and role/return-path rules.
3. Consume the existing per-email verification-mail policy before registration
   credential work, alongside any derivable trusted-IP limit. Preserve hashing-gate
   ordering and cross-process PostgreSQL counters.
4. Validate normalized return destinations before returning them; both ordinary and
   percent-encoded dot segments must not produce protocol-relative destinations.
5. Add a recoverable application error boundary above guarded layouts and auth
   pages. Render only safe unavailable/retry UI on failures, log server errors using
   the repository logger, and never expose error details or protected content.
   Clear failed container-initialization promises so a retry after database recovery
   can actually succeed; preserve successful per-module caching.

## Non-goals

Password reset, email changes, role-management UI, a new session store, new
dependencies, broad refactors, and changes to the implemented E01 spec.

## Acceptance criteria

- A link GET changes no verification/password/session state and sets no session.
- The inbox owner can select a password different from the registration password.
  Only the final password authenticates; the registration password cannot.
- Invalid, expired, superseded, and consumed links fail closed. A replay cannot
  replace a verified user's password. Authorization/role-home behavior is preserved.
- The fourth mail-producing registration for one email within an hour is denied,
  including with default proxy settings and across different trusted client IPs.
  A limited attempt does not hash or send mail.
- Normalization cannot turn an accepted return path into an external destination;
  ordinary same-origin paths, query strings, and fragments still work.
- Database failures yield a safe visible retry state without protected content,
  and retry recovers after the database becomes reachable.
- Focused regression tests and isolated integration tests exercise these behaviors.
  Every changed production-behavior file is in coverage.include with 100% statements,
  branches, functions, and lines. The configured gate, coverage, and integration
  commands all pass before completion.
