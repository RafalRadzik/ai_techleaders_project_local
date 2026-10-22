# Mentor onboarding: discovery prototype, revision 001

Date: 2026-10-22. Brief: `.ai/specs/product-brief.md`. Flow: "mentor onboarding" (Key flows, "Future state, mentor onboarding (1.0)"). Previous revision: none. Panel report: none supplied. No `[SYNTHETIC]` suggestions are recorded.

Open `index.html` in a browser (offline, no server). "Reset simulation" in the header returns to the start and clears every input and outcome. All data is fictitious and held in memory only. This prototype is not research evidence and does not satisfy the Definition of Ready.

## Simulation boundary (confirmed by the user, 2026-10-22)

- Actor: an invited senior engineer (demo name Ada Demo). Start: the invitation link. Success: prices set, mentor page and at least one slot published, share link shown.
- Included screens: invitation, sign in, mentor page, prices, slots, done. Outside the prototype: Stripe Connect (`#connect` says so and links back), invitation delivery, the operator's invitation and price-bound screens, booking by a mentee.
- Test-state controls (collapsed "Test state" panel): invitation valid, expired or already accepted; GitHub authorised, cancelled or unavailable.

## Rules and decisions kept

| ID | Source | Status | Where it shows |
|---|---|---|---|
| R07 / D08 | brief, `decisions/D08-invite-only.md` | active, owner founder A | Entry only through an invitation; expired and used invitation states say there is no open registration; guarded screens refuse without sign-in |
| R06 / D07 | `decisions/D07-login.md` | active, founder A | GitHub offered first, email plus password second |
| R04 / N02 | `decisions/N02-no-ratings.md` | active, founder A | Mentor page has a public-work link and plain description; no ratings or reviews |
| R08 / D09 | `decisions/D09-pricing.md` | active, founder A | Mentor sets 25- and 50-minute prices within bounds |
| R01 / R03 / N01 | D01, `decisions/N01-no-video.md` | active, founder A | Text sessions of 25 or 50 minutes stated on prices, slots and invitation |
| R14 / D22 | `decisions/D22-session-timing.md` | active | A slot must start at least two hours from the demo clock |
| R16 / D24 | `decisions/D24-beachhead.md` | active, founder A | Stack tags limited to TypeScript, React, Python, AI agents |
| R17 / D18 | `decisions/D18-a03-accepted-with-invitation-check.md` | active | Invitation text asks for a published session within two weeks |
| R05 / D04, D13 | brief | active | Connect onboarding is not simulated (outside the first iteration, Q19 open) |

## Assumptions

- [ASSUMPTION] A1: a slot is a single start time (brief: "the shape of a slot ... decided nowhere"). The mentee picks 25 or 50 minutes later. Check: the E02 slot story.
- [ASSUMPTION] A2: price bounds are fictional, 20 to 60 EUR for 25 minutes and 35 to 110 EUR for 50 minutes. The brief gives no amounts. Check: the operator's bounds (D09, E05-S02).
- [ASSUMPTION] A3: how a mentor learns that a slot was booked is not simulated (brief: open). Check: E03-S04.
- [ASSUMPTION] A4: currency EUR, time zone Europe/Warsaw, demo clock Tue 2026-11-03 10:00, slot start times offered between 10:00 and 16:00.
- [ASSUMPTION] A5: UI copy in English, as in the product (AGENTS.md).
- [ASSUMPTION] A6: publishing requires at least one slot (R17 only asks for one within two weeks). The profile could be published without slots. Check: the founders.
- [ASSUMPTION] A7: the mentor page requires a link, a description and one stack tag; the link is only checked for a dot. The brief names the fields but not their rules.
- [ASSUMPTION] A8: the sign-in step uses the accepted Epic 01 decisions (GitHub label "Continue with GitHub", generic wrong-credentials error, demo password `demo-haslo-12345`). Check: `lekcja-07/mapa-ekranow.md` (L24, L25).
- [ASSUMPTION] A9: the share link `devmentor.example/mentors/ada-demo` is a made-up placeholder shown as text.

## Screen and state map

| Screen (fragment) | Action | Next state | Rules / assumptions |
|---|---|---|---|
| `#invitation` valid | Accept and sign in | `#sign-in` | R07, R17 |
| `#invitation` expired or used | Test state; used offers "Go to sign in" | message; `#sign-in` | R07 |
| `#sign-in` GitHub | Continue with GitHub | short loading, then `#profile`, cancelled message, or unavailable message | R06, A8 |
| `#sign-in` email | Sign in | field errors, generic wrong-credentials error, or `#profile` | R06, A8 |
| `#profile` | Save and continue | field errors, or `#prices` | R04, R16, A7 |
| `#prices` | Save and continue | out-of-bounds errors, or `#slots`; Back to `#profile` | R08, A2 |
| `#slots` | Add slot, Remove, Publish | errors (no input, under two hours, duplicate, none added), or `#done` | R14, A1, A4, A6 |
| `#done` | Summary, share link, Connect link | `#connect`; Back to `#slots` | A9, R05 |
| `#connect` | Back to your page | `#done` | outside the prototype |
| `#denied` | Go to the invitation | any guarded fragment while signed out | R07 |
| `#unknown` | Go to the invitation | recovery for unknown fragments | none |

## Browser verification (agent-browser, local `file://`, 2026-10-22)

Static review passed: no external URLs, network calls, storage, cookies, imports or form actions; text from inputs goes into text nodes; headings, labels, buttons and links are semantic.

Browser walk, all observed as expected, with screenshots in `evidence/`:

1. Entry; guarded fragment without sign-in shows `#denied`; unknown fragment shows `#unknown` and its link recovers (`01`, `02`, `03`).
2. Expired and used invitations; used invitation reaches sign-in (`04`).
3. GitHub: loading text and disabled button, then cancelled and unavailable messages, focus returns to the button (`06`).
4. Email: field errors, generic wrong-password error with no session, then success (`07`, `08`).
5. Mentor page: empty submission shows three errors, correction proceeds (`09`, `10`).
6. Prices: out-of-bounds errors, correction proceeds (`11`, `12`).
7. Slots: publish with none, no input, a start under two hours (`13`), exactly two hours accepted, duplicate refused, removal, publish (`14`, `15`).
8. Done summary shows the entered data and slots; Connect page and Back link (`15`, `16`); browser back and forward move between screens with heading focus.
9. Reset restores the invitation and clears the outcome (the guard refuses `#done` afterwards).
10. Keyboard: Enter on a focused link navigates; visible focus outline 3px solid; 375 px viewport has no horizontal overflow (`17`).

Limits and checks not run:
- Keyboard: Tab order on `#sign-in` was traversed (GitHub, email, password, Sign in, Back link, then out of the page) and every stop showed a solid outline. Enter on a link navigated. Other screens were operated by click and not re-traversed by keyboard.
- Contrast was checked from the CSS values, not with a tool: text #222 or #555 on white or #f7f7f7 (above 7:1), header text #ddd on #222 (above 10:1).
- Tool notes: the CLI `fill` command cannot set a native date input, so the slot date is a select with four fixture dates. The CLI reported clicks on elements near the viewport edge as unreliable, so the walk used a tall viewport.
- Result: **passed** for the checks above. The prototype verifies simulated behavior only.

## Ownership

`prototype.json` records the SHA-256 inventory. A later `--refresh` writes `revision-002` and leaves this revision untouched.
