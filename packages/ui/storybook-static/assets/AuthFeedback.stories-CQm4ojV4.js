import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{r as n,t as r}from"./button-D0p5l_4u.js";import{n as i,t as a}from"./AuthFeedback-BgL12w6F.js";var o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P;function F(){return(F=e((()=>{n(),i(),o=t(),{fn:s}=__STORYBOOK_MODULE_TEST__,c=(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,onClick:s(),children:`Try again`}),l=(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,onClick:s(),children:`Continue with GitHub`}),u=(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,onClick:s(),children:`Resend verification email`}),d=(0,o.jsx)(r,{onClick:s(),children:`Sign in`}),f=(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,onClick:s(),children:`Go to my account`}),p={title:`Product/Authentication feedback`,component:a,tags:[`autodocs`],args:{state:`check-inbox`,detail:`Sent to jordan@example.test.`,actions:u},parameters:{docs:{description:{component:`Compact feedback for E01 authentication and access outcomes (#12 to #14). Error states use an alert; completed actions and information use a status. The host provides the confirmed state, destination or retry time, and working recovery callbacks. Story actions are recorded in the interaction panel; they do not contact authentication services.`}}},decorators:[e=>(0,o.jsx)(`div`,{style:{width:`100%`,maxWidth:460},children:(0,o.jsx)(e,{})})]},m={},h={args:{state:`verified`,detail:void 0,actions:(0,o.jsx)(r,{onClick:s(),children:`Continue to my account`})}},g={args:{state:`invalid-credentials`,detail:void 0,actions:void 0}},_={args:{state:`unverified-email`,detail:void 0}},v={args:{state:`github-account`,detail:void 0,actions:l}},y={args:{state:`account-exists`,detail:void 0,actions:d}},b={args:{state:`github-cancelled`,detail:void 0,actions:l}},x={args:{state:`github-state`,detail:void 0,actions:l}},S={args:{state:`github-unavailable`,detail:void 0,actions:l}},C={args:{state:`github-email`,detail:void 0,actions:l}},w={args:{state:`github-link`,detail:void 0,actions:u}},T={args:{state:`rate-limited`,detail:`You can request another email in 30 seconds.`,actions:(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,disabled:!0,children:`Resend available in 30 seconds`})}},E={args:{state:`service-unavailable`,detail:void 0,actions:c}},D={args:{state:`mail-unavailable`,detail:void 0,actions:u}},O={args:{state:`session-expired`,detail:void 0,actions:d}},k={args:{state:`forbidden`,detail:void 0,actions:f}},A={args:{state:`signed-out`,detail:void 0,actions:d}},j={args:{state:`verification-expired`,detail:void 0,actions:u}},M={args:{state:`verification-invalid`,detail:void 0,actions:u}},N={args:{state:`operator-revoked`,detail:void 0,actions:f}},P=[`CheckInbox`,`Verified`,`InvalidCredentials`,`UnverifiedEmail`,`GitHubAccount`,`AccountExists`,`GitHubCancelled`,`GitHubState`,`GitHubUnavailable`,`GitHubEmail`,`GitHubLink`,`RateLimited`,`ServiceUnavailable`,`MailUnavailable`,`SessionExpired`,`Forbidden`,`SignedOut`,`VerificationExpired`,`VerificationInvalid`,`OperatorRevoked`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'verified',
    detail: undefined,
    actions: <Button onClick={fn()}>Continue to my account</Button>
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'invalid-credentials',
    detail: undefined,
    actions: undefined
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'unverified-email',
    detail: undefined
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'github-account',
    detail: undefined,
    actions: github
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'account-exists',
    detail: undefined,
    actions: signIn
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'github-cancelled',
    detail: undefined,
    actions: github
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'github-state',
    detail: undefined,
    actions: github
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'github-unavailable',
    detail: undefined,
    actions: github
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'github-email',
    detail: undefined,
    actions: github
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'github-link',
    detail: undefined,
    actions: verify
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'rate-limited',
    detail: 'You can request another email in 30 seconds.',
    actions: <Button intent="neutral" appearance="stroke" disabled>Resend available in 30 seconds</Button>
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'service-unavailable',
    detail: undefined,
    actions: retry
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'mail-unavailable',
    detail: undefined,
    actions: verify
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'session-expired',
    detail: undefined,
    actions: signIn
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'forbidden',
    detail: undefined,
    actions: home
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'signed-out',
    detail: undefined,
    actions: signIn
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'verification-expired',
    detail: undefined,
    actions: verify
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'verification-invalid',
    detail: undefined,
    actions: verify
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'operator-revoked',
    detail: undefined,
    actions: home
  }
}`,...N.parameters?.docs?.source}}}})))()}F();export{y as AccountExists,m as CheckInbox,k as Forbidden,v as GitHubAccount,b as GitHubCancelled,C as GitHubEmail,w as GitHubLink,x as GitHubState,S as GitHubUnavailable,g as InvalidCredentials,D as MailUnavailable,N as OperatorRevoked,T as RateLimited,E as ServiceUnavailable,O as SessionExpired,A as SignedOut,_ as UnverifiedEmail,j as VerificationExpired,M as VerificationInvalid,h as Verified,P as __namedExportsOrder,p as default};