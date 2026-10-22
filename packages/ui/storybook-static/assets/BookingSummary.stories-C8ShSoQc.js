import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{r as n,t as r}from"./button-D0p5l_4u.js";import{n as i,r as a,t as o}from"./BookingSummary-DDfkqdhU.js";var s,c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{n(),a(),s=t(),c={title:`Product/Booking`,component:o,tags:[`autodocs`],args:{mentorName:`Alex Laurent`,startsAt:`2026-09-09T12:00:00Z`,dateLabel:`Wednesday, 9 September 2026`,timeLabel:`14:00–14:25`,timeZone:`Europe/Warsaw`,duration:25,total:`EUR 45.00`,actions:(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(r,{intent:`neutral`,appearance:`ghost`,children:`Change time`}),(0,s.jsx)(r,{children:`Continue to secure checkout`})]})},parameters:{docs:{description:{component:`Booking summary for #21/#22/#34. Prices, timezone and reservation state are input data. Stripe Checkout collects payment information; this component never collects card details. CancellationSummary supports later #24 and takes the server-calculated financial consequence without implementing policy.`}}}},l={},u={args:{duration:50,timeLabel:`14:00–14:50`,total:`EUR 80.00`}},d={args:{notice:`This time is reserved until 13:30 UTC while you complete checkout.`}},f={args:{notice:`Checking that your selected time is still available…`,actions:(0,s.jsx)(r,{disabled:!0,"aria-busy":`true`,children:`Checking availability…`})}},p={args:{mentorName:`Alexandra Kowalska-Laurent`,timeZone:`America/Argentina/Buenos_Aires`,timeLabel:`09:00–09:25`,total:`ARS 125,000.00`}},m={render:()=>(0,s.jsx)(i,{sessionLabel:`9 September, 14:00: Europe/Warsaw`,paid:`EUR 45.00`,refund:`EUR 45.00`,consequence:`Your session starts in more than 24 hours. The session fee will be refunded if you cancel.`,actions:(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(r,{intent:`neutral`,appearance:`ghost`,children:`Keep booking`}),(0,s.jsx)(r,{intent:`error`,appearance:`stroke`,children:`Review cancellation`})]})})},h={render:()=>(0,s.jsx)(i,{sessionLabel:`9 September, 14:00: Europe/Warsaw`,paid:`EUR 45.00`,refund:`EUR 0.00`,consequence:`Your session starts in less than 24 hours. Cancelling now forfeits the session fee.`,actions:(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(r,{intent:`neutral`,appearance:`ghost`,children:`Keep booking`}),(0,s.jsx)(r,{intent:`error`,appearance:`stroke`,children:`Review cancellation`})]})})},g=[`ReadyForCheckout`,`FiftyMinutes`,`Reserved`,`RefreshingAvailability`,`LongDetails`,`FreeCancellation`,`LateCancellation`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    duration: 50,
    timeLabel: '14:00–14:50',
    total: 'EUR 80.00'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    notice: 'This time is reserved until 13:30 UTC while you complete checkout.'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    notice: 'Checking that your selected time is still available…',
    actions: <Button disabled aria-busy="true">Checking availability…</Button>
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    mentorName: 'Alexandra Kowalska-Laurent',
    timeZone: 'America/Argentina/Buenos_Aires',
    timeLabel: '09:00–09:25',
    total: 'ARS 125,000.00'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <CancellationSummary sessionLabel="9 September, 14:00: Europe/Warsaw" paid="EUR 45.00" refund="EUR 45.00" consequence="Your session starts in more than 24 hours. The session fee will be refunded if you cancel." actions={<><Button intent="neutral" appearance="ghost">Keep booking</Button><Button intent="error" appearance="stroke">Review cancellation</Button></>} />
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <CancellationSummary sessionLabel="9 September, 14:00: Europe/Warsaw" paid="EUR 45.00" refund="EUR 0.00" consequence="Your session starts in less than 24 hours. Cancelling now forfeits the session fee." actions={<><Button intent="neutral" appearance="ghost">Keep booking</Button><Button intent="error" appearance="stroke">Review cancellation</Button></>} />
}`,...h.parameters?.docs?.source}}}})))()}_();export{u as FiftyMinutes,m as FreeCancellation,h as LateCancellation,p as LongDetails,l as ReadyForCheckout,f as RefreshingAvailability,d as Reserved,g as __namedExportsOrder,c as default};