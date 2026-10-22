import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{i as n,r}from"./react-Bl2r1tuC.js";import{c as i,s as a}from"./blocks-D62wjWJj.js";function o(e){let t={a:`a`,code:`code`,h1:`h1`,h2:`h2`,p:`p`,strong:`strong`,...n(),...e.components};return(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(a,{title:`Design system/E01 accounts and roles`}),`
`,(0,c.jsx)(t.h1,{id:`e01-accounts-and-roles`,children:`E01 accounts and roles`}),`
`,(0,c.jsxs)(t.p,{children:[`Walk through sign-in, email registration and role access in the
`,(0,c.jsx)(t.a,{href:`/prototypes/devmentor-journey/index.html#s12`,children:`connected prototype`}),`.
This page maps the UI to the Accounts and Roles specification dated
4 September 2026 and stories #12, #13 and #14. The prototype simulates account
state during the current visit. It does not create real accounts or establish
production authorization.`]}),`
`,(0,c.jsx)(t.h2,{id:`journey-coverage`,children:`Journey coverage`}),`
`,(0,c.jsxs)(t.p,{children:[`| Story | Success path | Failure and recovery |
| --- | --- | --- |
| `,(0,c.jsx)(t.a,{href:`https://github.com/open-mercato/ai_techleaders_project/issues/12`,rel:`nofollow`,children:`#12 GitHub sign-in`}),` | Sign-in (`,(0,c.jsx)(t.code,{children:`s12`}),`) opens the labelled GitHub response demo (`,(0,c.jsx)(t.code,{children:`s23`}),`). A successful result opens the account's role home or its permitted continuation. | Cancellation, an invalid sign-in request, an unavailable provider, an unverified GitHub primary email and an unverified local account each explain the next action. A refused attempt does not sign the person in. |
| `,(0,c.jsx)(t.a,{href:`https://github.com/open-mercato/ai_techleaders_project/issues/13`,rel:`nofollow`,children:`#13 Email and password`}),` | Registration (`,(0,c.jsx)(t.code,{children:`s20`}),`) leads to check-inbox (`,(0,c.jsx)(t.code,{children:`s21`}),`), email verification (`,(0,c.jsx)(t.code,{children:`s22`}),`) and the account home. Existing verified accounts use sign-in (`,(0,c.jsx)(t.code,{children:`s12`}),`). | Field validation, incorrect credentials, an existing account, a GitHub-only account, an unverified email, service or mail failure and a cooldown have recovery states. Invalid or expired verification links offer another email; reusing a verified link succeeds. |
| `,(0,c.jsx)(t.a,{href:`https://github.com/open-mercato/ai_techleaders_project/issues/14`,rel:`nofollow`,children:`#14 Roles and access`}),` | Mentee (`,(0,c.jsx)(t.code,{children:`s6`}),`), mentor (`,(0,c.jsx)(t.code,{children:`s11`}),`) and operator (`,(0,c.jsx)(t.code,{children:`s24`}),`) homes expose the navigation for the account's combined roles. Operators can open Users (`,(0,c.jsx)(t.code,{children:`s25`}),`). | Signed-out or expired sessions lead to sign-in. Wrong-role and revoked-operator states withhold protected content and offer a permitted destination. Sign-out returns to the public homepage. |`]}),`
`,(0,c.jsx)(t.p,{children:`The default home follows operator, then mentor, then mentee priority. It does not
remove navigation for the person's other roles. There is no product action for
granting mentor or operator access.`}),`
`,(0,c.jsx)(t.h2,{id:`review-the-connected-states`,children:`Review the connected states`}),`
`,(0,c.jsxs)(t.p,{children:[`Choose `,(0,c.jsx)(t.strong,{children:`Auth scenarios`}),` in the review toolbar to open `,(0,c.jsx)(t.strong,{children:`Authentication demo
controls`}),`. Expand `,(0,c.jsx)(t.strong,{children:`Demo email accounts and password`}),` for the fictional
credentials. `,(0,c.jsx)(t.strong,{children:`Next request result`}),` selects a failure for one request, and
`,(0,c.jsx)(t.strong,{children:`Verification link`}),` selects a valid, expired or invalid link. `,(0,c.jsx)(t.strong,{children:`Preview
GitHub-only release`}),` disables the email form while leaving GitHub available.`]}),`
`,(0,c.jsxs)(t.p,{children:[`The GitHub response preview (`,(0,c.jsx)(t.code,{children:`s23`}),`) has separate `,(0,c.jsx)(t.strong,{children:`GitHub demo account`}),` and
`,(0,c.jsx)(t.strong,{children:`GitHub response`}),` selectors. Session expiry and operator eligibility controls
stay in the review panel, separate from product navigation.`]}),`
`,(0,c.jsx)(t.p,{children:`| Review | What to check |
| --- | --- |
| Registration and verification | Enter a display name, valid email and password with at least 12 characters and at most 72 bytes. Registration alone grants no session. Choose Open verification link in the demo inbox, then Open my workspace. A newly registered mentee sees No sessions yet. |
| Retry after a failure | Under Next request result, select Service unavailable or Email delivery failed. Confirm the feedback explains a retry and the form retains its entries. The failure is consumed once; the next valid submission can succeed. |
| A reused or expired email link | Complete verification, reopen Check your inbox from the screen picker and open the valid link again. For an expired or invalid link, choose Request a new verification link. This returns to registration with the email filled in. Enter the name and password again, submit, set Verification link to Valid and open the replacement link. |
| Return to a booking | Choose Alex's time and session length before signing in. Successful sign-in returns to that selection. A refused attempt keeps it available for retry. |
| Combined roles | Use Taylor's mentee/mentor account or Sam's mentor/operator account. Check its default home and every permitted navigation link. |
| Live operator access | Sign in as Sam, open Operator home and choose Remove Sam's operator access. The user list becomes unavailable and the mentor role remains. Try Operator users through the screen picker, then choose Restore Sam's operator access and open Users again. |
| Expiry and sign-out | Choose Expire demo session while signed in. Protected content becomes unavailable until sign-in succeeds again. Sign out from a signed-in workspace to return to the public homepage. |`}),`
`,(0,c.jsx)(t.p,{children:`The screen picker keeps the existing screen IDs. Opening a protected screen
through review navigation still uses the current demo account's access state.`}),`
`,(0,c.jsx)(t.h2,{id:`shared-components`,children:`Shared components`}),`
`,(0,c.jsxs)(t.p,{children:[(0,c.jsx)(t.a,{href:`?path=/docs/product-account-form--docs`,children:`AccountForm`}),` composes the shared `,(0,c.jsx)(t.code,{children:`CrudForm`}),` with labelled fields, registration
and sign-in modes, a GitHub action and submission feedback. The host supplies its
schema, endpoint and success callback. `,(0,c.jsx)(t.a,{href:`?path=/docs/product-authentication-feedback--docs`,children:`AuthFeedback`}),` presents the confirmed
result, optional detail and recovery actions supplied by the host.`]}),`
`,(0,c.jsxs)(t.p,{children:[`| Component examples | States to review |
| --- | --- |
| `,(0,c.jsx)(t.a,{href:`?path=/story/product-account-form--sign-in`,children:`Sign-in`}),` and `,(0,c.jsx)(t.a,{href:`?path=/story/product-account-form--registration`,children:`registration`}),` | Field labels, password guidance, mode changes, provider order and full-width actions |
| `,(0,c.jsx)(t.a,{href:`?path=/story/product-account-form--client-validation`,children:`Client validation`}),`, `,(0,c.jsx)(t.a,{href:`?path=/story/product-account-form--submitting`,children:`submitting`}),` and `,(0,c.jsx)(t.a,{href:`?path=/story/product-account-form--service-unavailable`,children:`service failure`}),` | Associated errors, disabled repeat submission and retained entries |
| `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--check-inbox`,children:`Check inbox`}),`, `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--verified`,children:`verified`}),` and `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--verification-expired`,children:`expired link`}),` | Verification status, destination detail and recovery actions |
| `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--git-hub-cancelled`,children:`GitHub cancellation`}),` and `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--git-hub-account`,children:`account conflict`}),` | A clear result and the correct sign-in method |
| `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--session-expired`,children:`Expired session`}),` and `,(0,c.jsx)(t.a,{href:`?path=/story/product-authentication-feedback--operator-revoked`,children:`revoked operator access`}),` | Explanation and an available next destination |`]}),`
`,(0,c.jsx)(t.p,{children:`Feedback-story buttons demonstrate host-supplied action slots. The prototype
connects those actions to the full journey.`}),`
`,(0,c.jsxs)(t.p,{children:[`Both compose with `,(0,c.jsx)(t.code,{children:`AuthLayout`}),`. Provider and email actions fill the field width.
The neutral GitHub action comes first, followed by the primary email submit
action; back navigation stays separate. These styles follow the current
`,(0,c.jsx)(t.a,{href:`?path=/docs/design-system-usage-and-accessibility--docs`,children:`usage guidelines`}),`.`]}),`
`,(0,c.jsxs)(t.p,{children:[`The existing `,(0,c.jsx)(t.a,{href:`?path=/docs/product-account-access--docs`,children:`AccessStatus`}),` examples remain available for invitation and account
status compositions. `,(0,c.jsx)(t.code,{children:`AppShell`}),` accepts authorized navigation from its host; it
does not decide permissions.`]}),`
`,(0,c.jsx)(t.h2,{id:`production-work-still-required`,children:`Production work still required`}),`
`,(0,c.jsx)(t.p,{children:`The prototype uses fictional accounts and a local mock API. Its failure controls
advance scenarios manually; a rate-limit example does not run a real cooldown.
Requesting a replacement verification email repeats registration for the pending
address. OAuth exchange,
password hashing, email delivery, signed cookies, token validation, rate limiting,
database persistence and server-side role checks remain application work. Demo
expiry, account linking and operator eligibility illustrate their visible
outcomes; they are not security controls.`}),`
`,(0,c.jsx)(t.p,{children:`The production implementation must also verify concurrent callbacks, request
forgery protection, session revocation and secret rotation, transport failures,
and the operator allowlist on each protected request. These obligations cannot
be proved by a clickable prototype or component stories.`}),`
`,(0,c.jsx)(t.p,{children:`Password reset and invitation acceptance are outside E01. Invitation feedback
already has separate DS examples; this flow does not implement invitation
delivery, acceptance or mentor-role assignment.`})]})}function s(e={}){let{wrapper:t}={...n(),...e.components};return t?(0,c.jsx)(t,{...e,children:(0,c.jsx)(o,{...e})}):o(e)}var c;function l(){return(l=e((()=>{c=t(),r(),i()})))()}l();export{s as default};