import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{i as n,r}from"./react-Bl2r1tuC.js";import{c as i,s as a}from"./blocks-D62wjWJj.js";import{n as o,t as s}from"./badge-Dx1fspji.js";function c(e){let t={a:`a`,code:`code`,h1:`h1`,h2:`h2`,h3:`h3`,li:`li`,p:`p`,ul:`ul`,...n(),...e.components};return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(a,{title:`Design system/Usage and accessibility`}),`
`,(0,u.jsx)(t.h1,{id:`usage-and-accessibility`,children:`Usage and accessibility`}),`
`,(0,u.jsx)(t.p,{children:`Show the current state and the action a person can take. Keep related fields
together and give each task one primary action. Add a component to the library
when it meets a recurring product need and its props and behavior are stable.`}),`
`,(0,u.jsx)(t.h2,{id:`keyboard-and-focus`,children:`Keyboard and focus`}),`
`,(0,u.jsx)(t.p,{children:`| Family | Expected behavior |
| --- | --- |
| Button and links | Tab to reach; Enter activates, Space activates buttons. Links navigate. |
| Checkbox and switch | Space toggles. A visible label explains the setting. |
| Radio group | Arrow keys move between options; one value is selected. |
| Select | Open with keyboard, navigate options, Escape closes and returns focus. |
| Tabs | Arrow keys move through tabs; content belongs to the selected tab. |
| Menu | Arrow keys navigate items; Escape closes; trigger regains focus. |
| Dialog | Focus moves inside, Tab stays inside, Escape or an explicit close action exits. |
| Data table | A named scroll region allows wide tables to scroll with a keyboard. |`}),`
`,(0,u.jsxs)(t.p,{children:[`Dialogs need a title, appropriate initial focus and a return target. For destructive
confirmation, make the safe action easy to find. Do not replace modal behavior with
an opaque visual overlay. `,(0,u.jsx)(t.a,{href:`https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/`,rel:`nofollow`,children:`W3C modal-dialog guidance`}),`.`]}),`
`,(0,u.jsx)(t.h2,{id:`forms-and-feedback`,children:`Forms and feedback`}),`
`,(0,u.jsxs)(t.p,{children:[`Use `,(0,u.jsx)(t.code,{children:`FormField`}),` for standalone controls and `,(0,u.jsx)(t.code,{children:`CrudForm`}),` for schema-driven forms.
Keep labels visible; placeholders provide an example, not the only name. Connect
helper text and errors to the control. Required fields indicate the requirement in
text and semantics.`]}),`
`,(0,u.jsxs)(t.p,{children:[`Preserve entered values on failure. Explain what the person can change. A pending
request prevents another submission, and success appears after a confirmed result. Use
an alert for actionable errors and a status for nonurgent progress. Status messages
should be available without moving focus. `,(0,u.jsx)(t.a,{href:`https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html`,rel:`nofollow`,children:`W3C status-message guidance`}),`.`]}),`
`,(0,u.jsx)(t.h3,{id:`form-actions`,children:`Form actions`}),`
`,(0,u.jsx)(t.p,{children:`Align footer actions to the right. Put Cancel or another secondary action first,
then the primary submit action. Keep this order in the DOM and on screen, including
when buttons wrap on mobile. Use a neutral style for the secondary action. A
destructive action stays separate from the normal save action.`}),`
`,(0,u.jsxs)(t.p,{children:[(0,u.jsx)(t.code,{children:`CrudForm`}),` renders its cancel action before submit and applies the shared
`,(0,u.jsx)(t.code,{children:`dm-form-actions`}),` layout. Use the same order in custom form and dialog footers.
`,(0,u.jsx)(t.a,{href:`?path=/docs/backend-forms-crudform--docs`,children:`Open the form examples`}),`.`]}),`
`,(0,u.jsx)(t.h3,{id:`sign-in-actions`,children:`Sign-in actions`}),`
`,(0,u.jsx)(t.p,{children:`Provider and submit buttons span the field width. GitHub is a neutral alternative;
the email form's submit button is primary. Keep back navigation below the form,
centered and separate from both sign-in methods.`}),`
`,(0,u.jsxs)(t.p,{children:[`Use `,(0,u.jsx)(t.code,{children:`AuthLayout`}),` for this composition. The application supplies the authentication
actions and the back destination. `,(0,u.jsx)(t.a,{href:`?path=/docs/backend-layout-authlayout--docs`,children:`Open the sign-in examples`}),`.`]}),`
`,(0,u.jsx)(t.h2,{id:`color-motion-and-content`,children:`Color, motion and content`}),`
`,(0,u.jsxs)(t.p,{children:[`Use Inter Variable for interface text, controls and headings. The DevMentor
wordmark uses DM Mono (`,(0,u.jsx)(t.code,{children:`--dm-font-mono`}),`) for its programming-font style. Use DM Mono
for code and identifiers too. Keep the wordmark readable in both themes.`]}),`
`,(0,u.jsxs)(t.p,{children:[`Normal text needs at least 4.5:1 contrast; large text needs at least 3:1, subject to
the defined exceptions. Measure the final foreground/background pair in every
supported theme. A state name always accompanies color. `,(0,u.jsx)(t.a,{href:`https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html`,rel:`nofollow`,children:`W3C contrast guidance`}),`.`]}),`
`,(0,u.jsx)(t.p,{children:`Respect reduced-motion preferences. Loading retains readable copy when animation
is removed. Keep icon-only actions named and favor at least 44px touch targets in
product layouts, using compact primitives only where space and separation permit.`}),`
`,(0,u.jsx)(t.p,{children:`Use sentence case and concrete verbs: "Choose a time", "Save profile", "Request
changes". Avoid "Oops", unexplained codes and promises about payments that have not
been verified. Give dates a timezone and prices a currency. Display unavailable
metrics as unavailable, never as a made-up zero.`}),`
`,(0,u.jsx)(t.p,{children:`Describe what happened or what the person can do. Use direct, specific language;
skip slogans and generic promises. Keep useful validation and recovery
instructions, product facts and the current UI language when editing copy.`}),`
`,(0,u.jsx)(t.h2,{id:`responsive-compositions`,children:`Responsive compositions`}),`
`,(0,u.jsx)(t.h3,{id:`spacing`,children:`Spacing`}),`
`,(0,u.jsxs)(t.p,{children:[`Use 8px between a heading and its description, 16px between paragraphs,
24px between groups inside a panel, 32px between components, and 48 to 64px
between major page sections. Panels use 32px padding on desktop and 24px on mobile.
Use the semantic `,(0,u.jsx)(t.code,{children:`--dm-space-*-gap`}),` tokens to keep these gaps consistent.
Long prose uses a 65ch reading width and 16px/28px typography. Interface labels,
table data and controls retain the compact DS type scale. Separate page cards
with hairline borders and spacing; reserve elevation for overlays.`]}),`
`,(0,u.jsx)(t.h3,{id:`fact-and-technology-chips`,children:`Fact and technology chips`}),`
`,(0,u.jsxs)(t.p,{children:[`Use one noninteractive, neutral chip per short fact when it makes comparison
easier. For example, allowed prices become `,(0,u.jsx)(t.code,{children:`25 min: PLN 90–600`}),` and
`,(0,u.jsx)(t.code,{children:`50 min: PLN 180–1,200`}),`, with 8px between chips and wrapping on small screens.
Retain the units and currency in each chip. Keep explanations and validation
messages as prose. A fact chip is not a filter; selectable chips need actual
controls, and semantic colors describe real statuses.`]}),`
`,(0,u.jsxs)(t.p,{children:[`Technology chips pair a recognizable icon with the visible label. Use the shared
`,(0,u.jsx)(t.code,{children:`TechnologyChips`}),` component for TypeScript, React, API design and other topics.
Icons are decorative; unfamiliar technologies retain their name and use a neutral
code symbol.`]}),`
`,(0,u.jsxs)(`p`,{className:`dm-fact-chips`,role:`group`,"aria-label":`Allowed session prices`,children:[(0,u.jsx)(s,{variant:`outline`,children:`25 min: PLN 90–600`}),(0,u.jsx)(s,{variant:`outline`,children:`50 min: PLN 180–1,200`})]}),`
`,(0,u.jsx)(t.p,{children:`Separate metadata with spacing, new lines or individual chips. Do not join facts
with middle dots, bullet dots or standalone periods. Labels may use a colon;
normal sentence punctuation is fine.`}),`
`,(0,u.jsx)(t.h3,{id:`homepage-feature-chips`,children:`Homepage feature chips`}),`
`,(0,u.jsxs)(t.p,{children:[`Give homepage feature chips 12px vertical and 16px horizontal padding, 14px
semibold blue text, and 18px decorative icons. Leave 12px between chips and let
them wrap on small screens. Use `,(0,u.jsx)(t.code,{children:`--dm-action-primary-label`}),` on a neutral surface
and check text contrast in both themes.`]}),`
`,(0,u.jsx)(t.p,{children:`Keep the label visible and hide the icon from assistive technology. These chips
describe session features and are not buttons or filters. Reserve this blue
emphasis for homepage features; comparable metadata stays neutral, and status
colors continue to describe actual states.`}),`
`,(0,u.jsx)(t.h3,{id:`check-the-complete-screen`,children:`Check the complete screen`}),`
`,(0,u.jsx)(t.p,{children:`Review desktop and compact containers, long names, translated-length copy and
empty data. Reading order should match keyboard order. Keep session summary and
consequences before a confirmation action. Let fields and cards fill available
space; contain horizontal scrolling within tables and code blocks.`}),`
`,(0,u.jsx)(t.h2,{id:`mentor-ratings-and-written-reviews`,children:`Mentor ratings and written reviews`}),`
`,(0,u.jsxs)(t.p,{children:[`Mentor ratings and reviews are part of the design system,
as requested on 7 September 2026. Use `,(0,u.jsx)(t.code,{children:`MentorRatingSummary`}),` for an average and review
count, `,(0,u.jsx)(t.code,{children:`MentorReviews`}),` for individual feedback, and `,(0,u.jsx)(t.code,{children:`MentorReviewForm`}),` after an
eligible completed session. A zero count reads "No reviews yet"; it is not a
zero-star score.`]}),`
`,(0,u.jsx)(t.p,{children:`State ratings as "out of 5" in accessible text. Keep review authors, dates and
written feedback readable, with 24/32px grouping and a comfortable reading width.
The form uses native star radio controls, a required written review, associated
errors and pending feedback. Failed submissions retain the rating and text.`}),`
`,(0,u.jsx)(t.p,{children:`Storybook reviews are fictional demo feedback. The displayed average must match
the supplied ratings: 5, 4 and 5 produce 4.7 from three reviews. These examples do
not establish real customer satisfaction or verified-session claims. The host
must enforce eligibility, authentication, storage and publication; production
moderation and review policy are still to be defined. The review form validates
the rating and text, then calls the supplied submission callback. It does not
store or publish reviews itself. Public reviews remain separate from private
session notes.`}),`
`,(0,u.jsx)(t.h2,{id:`text-conversations`,children:`Text conversations`}),`
`,(0,u.jsxs)(t.p,{children:[`Lead with the transcript and place the composer near the latest message. Keep
authors visible: the current person's messages sit on the right and include
"You"; received messages sit on the left. The application supplies `,(0,u.jsx)(t.code,{children:`isOwn`}),` to
`,(0,u.jsx)(t.code,{children:`SessionTranscript`}),`. Do not infer ownership from a name or rely on color alone.`]}),`
`,(0,u.jsx)(t.p,{children:`Message history must remain reachable by keyboard. Preserve its reading position
when new messages arrive, retain drafts after a failed send, and keep delivery
feedback next to its message. Do not add presence or read receipts without data
from the application.`}),`
`,(0,u.jsx)(t.p,{children:`Before a session starts, explain when messaging becomes available. After it ends,
replace the composer with an ended-session message and show the written answer
when it is posted. Reading an answer must not end an active session. Label any
story time or completion controls as demo controls, separate from product
actions.`}),`
`,(0,u.jsxs)(t.p,{children:[`The examples use fictional messages. Transport, timing and the Q18 channel
decision belong to the product integration. `,(0,u.jsx)(t.a,{href:`?path=/docs/product-written-answer-and-transcript--docs`,children:`Open the transcript and answer
examples`}),`, including
`,(0,u.jsx)(t.a,{href:`?path=/story/product-written-answer-and-transcript--delivery-states`,children:`delivery states`}),`
and a `,(0,u.jsx)(t.a,{href:`?path=/story/product-written-answer-and-transcript--text-transcript`,children:`completed conversation`}),`.`]}),`
`,(0,u.jsx)(t.h2,{id:`product-rules-carried-by-the-ui`,children:`Product rules carried by the UI`}),`
`,(0,u.jsxs)(t.ul,{children:[`
`,(0,u.jsx)(t.li,{children:`Sessions are text only, for 25 or 50 minutes.`}),`
`,(0,u.jsx)(t.li,{children:`Availability and booking eligibility come from authoritative application data.`}),`
`,(0,u.jsx)(t.li,{children:`Checkout return does not establish payment success.`}),`
`,(0,u.jsx)(t.li,{children:`Private-note approval does not publish the note.`}),`
`,(0,u.jsx)(t.li,{children:`Mentor reviews require a completed session; the host determines eligibility.`}),`
`,(0,u.jsx)(t.li,{children:`Roles are additive; the application supplies authorized navigation and actions.`}),`
`,(0,u.jsx)(t.li,{children:`The conversation channel and first-iteration payout policy remain product decisions.`}),`
`]}),`
`,(0,u.jsx)(t.p,{children:`These rules describe component presentation. Service-side validation, authorization,
payment verification and persistence belong to the application feature.`})]})}function l(e={}){let{wrapper:t}={...n(),...e.components};return t?(0,u.jsx)(t,{...e,children:(0,u.jsx)(c,{...e})}):c(e)}var u;function d(){return(d=e((()=>{u=t(),r(),i(),o()})))()}d();export{l as default};