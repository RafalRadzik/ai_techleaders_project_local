import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{r as n,t as r}from"./button-D0p5l_4u.js";import{i,n as a,r as o,t as s}from"./PaymentStatus-CdVUWmDt.js";var c,l,u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{n(),i(),c=t(),l={title:`Product/Payments`,component:a,tags:[`autodocs`],args:{state:`pending`,reference:`DM-2026-0018`,actions:(0,c.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Check payment status`})},parameters:{docs:{description:{component:`Provider-confirmed payment states for #22/#34 and later Connect, transfer and refund patterns for #19/#24/#25/#33. A returned checkout URL is not payment proof. Components do not trigger payments or assume that a failed confirmation means nothing was charged. First-iteration payout policy remains a product dependency (Q19).`}}}},u={},d={args:{state:`redirecting`,actions:(0,c.jsx)(r,{disabled:!0,"aria-busy":`true`,children:`Opening checkout…`})}},f={args:{state:`confirmed`,actions:(0,c.jsx)(r,{children:`View upcoming sessions`})}},p={args:{state:`failed`}},m={args:{state:`expired`,actions:(0,c.jsx)(r,{children:`Choose another time`})}},h={args:{state:`slot-taken`,actions:(0,c.jsx)(r,{children:`Choose another time`})}},g={args:{state:`refund-pending`,actions:void 0}},_={args:{state:`refunded`,actions:void 0}},v={args:{state:`refund-failed`,actions:(0,c.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Contact support`})}},y={render:()=>(0,c.jsx)(`div`,{className:`dm-product-grid`,children:[`incomplete`,`pending`,`enabled`,`restricted`].map(e=>(0,c.jsx)(s,{state:e,actions:e===`incomplete`||e===`restricted`?(0,c.jsx)(r,{children:`Continue in Stripe`}):void 0},e))})},b={render:()=>(0,c.jsx)(`div`,{className:`dm-product-grid`,children:[`held`,`scheduled`,`transferred`,`failed`].map(e=>(0,c.jsx)(o,{state:e,gross:`EUR 80.00`,fee:`EUR 16.00`,net:`EUR 64.00`,detail:e===`held`?`Waiting for confirmation that the payout can be released.`:e===`failed`?`Review the connected account requirements.`:`Status provided by the payment service.`,actions:e===`failed`?(0,c.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`View account requirements`}):void 0},e))})},x=[`AwaitingConfirmation`,`Redirecting`,`Confirmed`,`Failed`,`Expired`,`SlotTaken`,`RefundPending`,`Refunded`,`RefundFailed`,`ConnectStates`,`PayoutStates`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'redirecting',
    actions: <Button disabled aria-busy="true">Opening checkout…</Button>
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'confirmed',
    actions: <Button>View upcoming sessions</Button>
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'failed'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'expired',
    actions: <Button>Choose another time</Button>
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'slot-taken',
    actions: <Button>Choose another time</Button>
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'refund-pending',
    actions: undefined
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'refunded',
    actions: undefined
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'refund-failed',
    actions: <Button intent="neutral" appearance="stroke">Contact support</Button>
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <div className="dm-product-grid">{(['incomplete', 'pending', 'enabled', 'restricted'] as const).map(state => <ConnectStatus key={state} state={state} actions={state === 'incomplete' || state === 'restricted' ? <Button>Continue in Stripe</Button> : undefined} />)}</div>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <div className="dm-product-grid">{(['held', 'scheduled', 'transferred', 'failed'] as const).map(state => <PayoutStatus key={state} state={state} gross="EUR 80.00" fee="EUR 16.00" net="EUR 64.00" detail={state === 'held' ? 'Waiting for confirmation that the payout can be released.' : state === 'failed' ? 'Review the connected account requirements.' : 'Status provided by the payment service.'} actions={state === 'failed' ? <Button intent="neutral" appearance="stroke">View account requirements</Button> : undefined} />)}</div>
}`,...b.parameters?.docs?.source}}}})))()}S();export{u as AwaitingConfirmation,f as Confirmed,y as ConnectStates,m as Expired,p as Failed,b as PayoutStates,d as Redirecting,v as RefundFailed,g as RefundPending,_ as Refunded,h as SlotTaken,x as __namedExportsOrder,l as default};