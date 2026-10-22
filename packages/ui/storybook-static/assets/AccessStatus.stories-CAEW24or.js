import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{r as n,t as r}from"./button-D0p5l_4u.js";import{n as i,t as a}from"./AccessStatus-XMJ8f79I.js";var o,s,c,l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{n(),i(),o=t(),s={title:`Product/Account access`,component:a,tags:[`autodocs`],args:{state:`check-inbox`,detail:`Verification sent to jamie@example.com.`,actions:(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Resend verification email`})},parameters:{docs:{description:{component:`Recovery and invitation states for #12 to #15. This composition displays server state and authorized actions; it performs no authentication, access checks or invitation acceptance. Deadlines are supplied by the caller.`}}}},c={},l={args:{state:`verified`,detail:void 0,actions:(0,o.jsx)(r,{children:`Continue to sessions`})}},u={args:{state:`session-expired`,detail:void 0,actions:(0,o.jsx)(r,{children:`Sign in again`})}},d={args:{state:`forbidden`,detail:void 0,actions:(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Go to my sessions`})}},f={args:{state:`oauth-cancelled`,detail:void 0,actions:(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Continue with GitHub`}),(0,o.jsx)(r,{children:`Use email`})]})}},p={args:{state:`method-unavailable`,detail:void 0,actions:(0,o.jsx)(r,{children:`Use email instead`})}},m={args:{state:`invitation-accepted`,detail:`Publish your first bookable session by 21 September 2026, within 14 days of accepting.`,actions:(0,o.jsx)(r,{children:`Complete mentor profile`})}},h={args:{state:`invitation-invalid`,detail:void 0,actions:(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Contact the sender`})}},g={args:{state:`invitation-expired`,detail:void 0,actions:(0,o.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Request a new invitation`})}},_={args:{state:`invitation-used`,detail:void 0,actions:(0,o.jsx)(r,{children:`Sign in`})}},v=[`CheckInbox`,`Verified`,`SessionExpired`,`NoAccess`,`OAuthCancelled`,`MethodUnavailable`,`InvitationAccepted`,`InvitationInvalid`,`InvitationExpired`,`InvitationUsed`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'verified',
    detail: undefined,
    actions: <Button>Continue to sessions</Button>
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'session-expired',
    detail: undefined,
    actions: <Button>Sign in again</Button>
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'forbidden',
    detail: undefined,
    actions: <Button intent="neutral" appearance="stroke">Go to my sessions</Button>
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'oauth-cancelled',
    detail: undefined,
    actions: <><Button intent="neutral" appearance="stroke">Continue with GitHub</Button><Button>Use email</Button></>
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'method-unavailable',
    detail: undefined,
    actions: <Button>Use email instead</Button>
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'invitation-accepted',
    detail: 'Publish your first bookable session by 21 September 2026, within 14 days of accepting.',
    actions: <Button>Complete mentor profile</Button>
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'invitation-invalid',
    detail: undefined,
    actions: <Button intent="neutral" appearance="stroke">Contact the sender</Button>
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'invitation-expired',
    detail: undefined,
    actions: <Button intent="neutral" appearance="stroke">Request a new invitation</Button>
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'invitation-used',
    detail: undefined,
    actions: <Button>Sign in</Button>
  }
}`,..._.parameters?.docs?.source}}}})))()}y();export{c as CheckInbox,m as InvitationAccepted,g as InvitationExpired,h as InvitationInvalid,_ as InvitationUsed,p as MethodUnavailable,d as NoAccess,f as OAuthCancelled,u as SessionExpired,l as Verified,v as __namedExportsOrder,s as default};