# DevMentor - product brief

- Date: 2026-10-16
- Mode: own; Owner: RafalRadzik; Pass: full
- Evidence basis: Four distinct developer interview notes inform this scope; independent recruitment and representativeness are unknown. Team decisions establish scope, not demand. No observed purchase of this offer or agreed mentor supply.
- Coverage: 15 claims — 12 sourced (interview 4, data 0, document 8, product 0, benchmark 0), 0 synthetic, 3 assumed; 1 entry on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: RafalRadzik confirmed scope and limitations, not launch readiness; ready for: pilot planning and recruitment only.
- Sources: Linked below; repository context: [README](../../README.md), [compatibility](../../BACKWARD_COMPATIBILITY.md).

## Decision summary

The owner chose a manual paid-text pilot (D02), superseding the open-focus decision D01. Technical blockers are supported by individual accounts, but scheduled help may miss their short waiting tolerances. No mentor has agreed. Price, payer, cancellation/refund terms, responsibilities and evaluation criteria block selling sessions. Plan and recruit first; the recruitment owner remains unassigned.

## Vision

Help developers obtain specific technical assistance; intended direction, not a demonstrated benefit. [DOCUMENT] [D02](research/decisions/D02-manual-paid-text-pilot.md)

## Target group and stakeholders

- User: developers, as selected by the owner; this does not imply universal need. Customer/payer remains unresolved. [DOCUMENT] [D02](research/decisions/D02-manual-paid-text-pilot.md)
- Scope decider: RafalRadzik; delivery operator unassigned. Oliwia retains N01/N02 authority.

## Problems, with evidence

- One working developer described a TypeScript blocker, conflicting Discord answers and wanting help within an hour. [INTERVIEW] [Working developer](research/2026-08-20-interview-working-dev.md)
- One backend developer described a Helm/ingress blocker, an unanswered internal channel, help needed within twenty minutes and booking under five minutes; reported prior Codementor payment/use had an unsuccessful access experience, not validation of this offer. [INTERVIEW] [Backend developer](research/2026-09-01-interview-backend-dev-fintech.md)
- One freelancer wanted same-day conversation for estimation and text for bugs; this does not establish text suitability for every task. [INTERVIEW] [Freelancer](research/2026-09-02-interview-freelancer-react.md)
- One platform developer solved the incident alone and said an internal channel was available if urgent; rare employer-funded outside help was hypothetical. [INTERVIEW] [Platform developer](research/2026-09-02-interview-platform-dev-solves-alone.md)

## Product and how it stands out

Manual consultation under D02. Differentiation is unproven; test A01 rather than claiming superiority.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|

Benchmark comparison deferred: not needed to choose manual delivery.

## Goals and success criteria

- Business goal: smallest paid-text MVP; no revenue target approved (D02).
- Proposed learning outcome: record actual payment, completion and whether assistance addressed the submitted problem; not an agreed success criterion. [ASSUMPTION] Agent proposal; A01.
- Baseline, price, threshold and review date unknown. Preserve N01/N02.

## Scope

- **Now:** Plan and recruit for the manual service in R01/D02; resolve Q01-Q04 before selling.
- **Later:** No commitment to further product features.
- **Not doing:** N01-N03.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Live text | Both parties attend an agreed time; not immediate/on-demand availability | RafalRadzik | Developer, mentor |
| Prepaid | Payment before the session; does not mean nonrefundable | RafalRadzik | Developer, mentor |

## Key flows

- Current: attempts through own investigation, internal channels or community help; see individual Problems, not a universal sequence.
- Future proposal: submit problem -> manual fit/time agreement -> payment link -> existing text tool at booked time -> outcome capture. D02 approves the delivery model; screening and outcome capture remain proposals, not operating requirements.

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Prepaid, scheduled 25- or 50-minute live text sessions | Pilot offer | [DOCUMENT] [D02](research/decisions/D02-manual-paid-text-pilot.md) | active | Unknown | Owner-approved superseding row | RafalRadzik | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Video calls; disclose text sessions on every session screen | Existing constraint | Oliwia, founder A | active | Unknown | Superseding record by founder A | [DOCUMENT] [N01](research/decisions/N01-no-video.md) | none |
| N02 | Ratings/reviews profiles; existing mentor pages must link public work and plainly describe experience | Existing trust approach; does not require building pages | Oliwia, founder A | active | Unknown | Superseding record by founder A | [DOCUMENT] [N02](research/decisions/N02-no-ratings.md) | none |
| N03 | Vault, subscriptions, MCP, automated marketplace in this pilot | Keep manual pilot small | RafalRadzik | active | Unknown | Owner-approved superseding row | [DOCUMENT] [D02](research/decisions/D02-manual-paid-text-pilot.md) | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-16 | Keep initial focus open | Evidence did not settle lead offer | Brief owner | superseded | Superseded by D02 | Preserve history | [DOCUMENT] [D01](research/decisions/D01-keep-product-focus-open.md) | none |
| D02 | 2026-10-16 | Manual paid-text pilot; matching, payment links and existing chat permitted, no custom app required | Owner selected scheduled over immediate/async help and manual over app delivery after agent explained tradeoff; no new demand evidence | RafalRadzik | active | Unknown | Owner-approved superseding row | [DOCUMENT] [D02](research/decisions/D02-manual-paid-text-pilot.md) | D01 |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Developers will pay for scheduled text help [ASSUMPTION] Product hypothesis | high | Problems show urgency, not purchase of this offer | Revise offer | Proposed: observe payment and completed help with disclosed wait and price; not just stated interest | Unassigned | Unknown | untested |
| A02 | Mentors will agree to deliver [ASSUMPTION] Supply hypothesis | high | Owner confirms none agreed, D02 | Cannot deliver | Obtain explicit delivery agreement and availability | Unassigned | Before accepting payment | untested |

## Kill criteria

Undecided: Q04 blocks interpreting pilot results as a continue/stop decision.

## Hypotheses to test

No synthetic walkthrough conducted.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Price, payer and cancellation/refund terms? | Yes: selling | RafalRadzik with delivery operator | open |
| Q02 | Who delivers, using which tool, with what scheduling/rescheduling responsibilities? | Yes: accepting bookings | Operator and mentor; not assigned | open |
| Q03 | Which mentor agrees to the offer and availability? | Yes: launch | Prospective mentor | open; none agreed |
| Q04 | What outcome and review point determine continuation or revision? | Yes: pilot evaluation and agreed launch readiness | RafalRadzik | open; unanswered |

## Definition of Ready addendum (own)

Individual accounts support technical-help problems, not segment prevalence. D02 confirms scope, not untested demand, mentor availability or fit with urgent needs. Ready for planning/recruitment only; Q01-Q04 prevent launch approval. No implementation backlog is authorized. Product readiness automation is not enabled in configuration.

## Collection plan

### Will a mentor explicitly agree to deliver this offer?

- Decision/work: Q03 and delivery feasibility, not customer demand.
- Who/how: Discuss paid text delivery and availability with a prospective mentor; distinguish interest from agreement.
- Owner: Unassigned. Needed before accepting payment.
- Template: [Mentor agreement](research/templates/mentor-agreement.md).
