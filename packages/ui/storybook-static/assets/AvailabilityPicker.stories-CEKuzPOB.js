import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{n as r,r as i,t as a}from"./AvailabilityPicker-Dg9KsXc9.js";function o(e){let[t,n]=(0,s.useState)(e.selectedSlotId),[i,o]=(0,s.useState)(25);return(0,c.jsxs)(`div`,{className:`dm-product-panel`,children:[(0,c.jsx)(a,{...e,selectedSlotId:t,onSlotChange:t=>{n(t),e.onSlotChange(t)}}),(0,c.jsx)(`div`,{className:`dm-product-divider`}),(0,c.jsx)(r,{options:[{minutes:25,price:`EUR 45.00`},{minutes:50,price:`EUR 80.00`}],selected:i,onChange:o}),(0,c.jsx)(`p`,{className:`dm-product-caption`,children:`Text mentoring session. Prices and availability are supplied by the mentor.`})]})}var s,c,l,u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{s=t(),i(),c=n(),{expect:l,fn:u,userEvent:d,within:f}=__STORYBOOK_MODULE_TEST__,p=[{date:`2026-09-09`,label:`Wednesday, 9 September`,slots:[{id:`soon`,start:`2026-09-09T09:00:00Z`,label:`11:00`,blockedReason:`Starts in less than 2 hours`},{id:`wed-14`,start:`2026-09-09T12:00:00Z`,label:`14:00`},{id:`wed-15`,start:`2026-09-09T13:00:00Z`,label:`15:00`,blockedReason:`Already booked`},{id:`wed-16`,start:`2026-09-09T14:00:00Z`,label:`16:00`}]},{date:`2026-09-10`,label:`Thursday, 10 September`,slots:[{id:`thu-10`,start:`2026-09-10T08:00:00Z`,label:`10:00`},{id:`thu-14`,start:`2026-09-10T12:00:00Z`,label:`14:00`}]}],m={title:`Product/Availability`,component:a,tags:[`autodocs`],render:e=>(0,c.jsx)(o,{...e}),args:{days:p,timeZone:`Europe/Warsaw`,selectedSlotId:null,onSlotChange:u()},parameters:{docs:{description:{component:`Available time and 25/50-minute price choices for #17, #18 and #21. The application evaluates lead time, booked slots and configured price bounds; these components display supplied reasons. A blocked slot has a disabled button and a linked explanation. Timezone and formatted prices are always explicit.`}}}},h={play:async({canvasElement:e,args:t})=>{let n=f(e),r=n.getAllByRole(`button`,{name:`14:00`})[0];await d.click(r),await l(r).toHaveAttribute(`aria-pressed`,`true`),await l(t.onSlotChange).toHaveBeenCalledWith(`wed-14`),await l(n.getByRole(`button`,{name:`11:00`})).toBeDisabled()}},g={args:{selectedSlotId:`wed-14`}},_={args:{disabled:!0,selectedSlotId:`wed-14`}},v={args:{days:[]}},y={args:{days:[{date:`2026-09-09`,label:`Wednesday, 9 September`,slots:[{id:`1`,start:`2026-09-09T12:00:00Z`,label:`14:00`,blockedReason:`Already booked`},{id:`2`,start:`2026-09-09T13:00:00Z`,label:`15:00`,blockedReason:`Already booked`}]}]}},b={render:()=>(0,c.jsx)(r,{options:[{minutes:25,price:`EUR 45.00`},{minutes:50,price:`Not available`,unavailableReason:`This session price has not been configured.`}],selected:25,onChange:u()})},x=[`ChooseTimeAndDuration`,`Selected`,`Refreshing`,`Empty`,`AllTimesTaken`,`MissingPrice`],h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    const slot = canvas.getAllByRole('button', {
      name: '14:00'
    })[0]!;
    await userEvent.click(slot);
    await expect(slot).toHaveAttribute('aria-pressed', 'true');
    await expect(args.onSlotChange).toHaveBeenCalledWith('wed-14');
    await expect(canvas.getByRole('button', {
      name: '11:00'
    })).toBeDisabled();
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    selectedSlotId: 'wed-14'
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    selectedSlotId: 'wed-14'
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    days: []
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    days: [{
      date: '2026-09-09',
      label: 'Wednesday, 9 September',
      slots: [{
        id: '1',
        start: '2026-09-09T12:00:00Z',
        label: '14:00',
        blockedReason: 'Already booked'
      }, {
        id: '2',
        start: '2026-09-09T13:00:00Z',
        label: '15:00',
        blockedReason: 'Already booked'
      }]
    }]
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <DurationSelector options={[{
    minutes: 25,
    price: 'EUR 45.00'
  }, {
    minutes: 50,
    price: 'Not available',
    unavailableReason: 'This session price has not been configured.'
  }]} selected={25} onChange={fn()} />
}`,...b.parameters?.docs?.source}}}})))()}S();export{y as AllTimesTaken,h as ChooseTimeAndDuration,v as Empty,b as MissingPrice,_ as Refreshing,g as Selected,x as __namedExportsOrder,m as default};