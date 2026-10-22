import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{c as n,s as r}from"./cookieStore-Sbrxgkoa.js";import{i,n as a,r as o,t as s}from"./CrudForm-SWEkoGIS.js";import{t as c}from"./jsx-runtime-DeHZSEgm.js";import{r as l,t as u}from"./button-D0p5l_4u.js";import{c as d,i as f,o as p,s as m,t as h,u as g}from"./schemas-Dn923O-v.js";import{n as _,t as v}from"./DataTable-b0caO54C.js";function y({title:e,description:t,form:n}){let[r,i]=(0,b.useState)(!1);return(0,x.jsxs)(`div`,{className:`dm-product-panel`,children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h2`,{className:`dm-product-heading`,children:e}),(0,x.jsx)(`p`,{className:`dm-product-muted`,children:t})]}),(0,x.jsx)(s,{...n,onSuccess:()=>i(!0)}),r&&(0,x.jsx)(`p`,{role:`status`,className:`dm-product-callout`,children:`Saved in this local example. No account, availability or note was changed.`})]})}var b,x,S,C,w,T,E,D,O,k,A,j,M,N,P;function F(){return(F=e((()=>{b=t(),i(),n(),f(),l(),a(),_(),x=c(),{expect:S,userEvent:C,within:w}=__STORYBOOK_MODULE_TEST__,T={schema:m({displayName:d().trim().min(2,`Enter your display name.`),publicWork:g(`Enter a full URL for your public work.`),description:d().trim().min(20,`Tell mentees what you can help them with.`),stack:d().min(1,`Choose a primary stack.`)}),fields:[{name:`displayName`,label:`Display name`},{name:`publicWork`,label:`Link to public work`,placeholder:`https://github.com/your-name`},{name:`description`,label:`How you can help`,type:`textarea`},{name:`stack`,label:`Primary stack`,type:`select`,options:[{label:`TypeScript`,value:`typescript`},{label:`React`,value:`react`},{label:`Python`,value:`python`}]}],initialValues:{displayName:`Alex Laurent`,publicWork:`https://example.com/alex/work`,description:`I help developers work through TypeScript API questions and decide where to test.`,stack:`typescript`},endpoint:`/storybook-api/mentor-workspace/profile`,submitLabel:`Save profile`},E={title:`Product/Mentor workspace`,tags:[`autodocs`],parameters:{msw:{handlers:[o.post(`/storybook-api/mentor-workspace/:form`,()=>r.json({ok:!0,data:{id:`local-example`}}))]},docs:{description:{component:`Mentor editing forms and tables using CrudForm and DataTable for #16/#17/#18/#28. They share client/server schema shapes and use only local MSW requests. Date-times are local wall-clock inputs with an explicit timezone; the application must resolve timezone/DST and validate booking conflicts. Example price bounds are story configuration, not product policy.`}}}},D={render:()=>(0,x.jsx)(y,{title:`Your mentor profile`,description:`Describe what you can help with and add a link to your public work.`,form:T})},O={render:()=>(0,x.jsx)(y,{title:`Publish a text session time`,description:`Enter local times in the selected timezone. The application checks conflicts before publishing.`,form:{schema:m({startsAt:d().min(1,`Choose a start time.`),endsAt:d().min(1,`Choose an end time.`),timeZone:h([`Europe/Warsaw`,`UTC`,`America/New_York`])}).refine(e=>e.endsAt>e.startsAt,{path:[`endsAt`],message:`End time must be after start time.`}),fields:[{name:`startsAt`,label:`Starts at`,type:`datetime-local`},{name:`endsAt`,label:`Ends at`,type:`datetime-local`},{name:`timeZone`,label:`Timezone`,type:`select`,options:[{label:`Europe/Warsaw`,value:`Europe/Warsaw`},{label:`UTC`,value:`UTC`},{label:`America/New_York`,value:`America/New_York`}]}],initialValues:{startsAt:`2026-09-09T14:00`,endsAt:`2026-09-09T15:00`,timeZone:`Europe/Warsaw`},endpoint:`/storybook-api/mentor-workspace/availability`,submitLabel:`Publish availability`}})},k={schema:m({price25:p(`Set a price for 25 minutes.`).min(5,`The example minimum is 5.`).max(300,`The example maximum is 300.`),price50:p(`Set a price for 50 minutes.`).min(10,`The example minimum is 10.`).max(600,`The example maximum is 600.`),currency:h([`EUR`,`USD`])}),fields:[{name:`price25`,label:`25-minute price`,type:`number`},{name:`price50`,label:`50-minute price`,type:`number`},{name:`currency`,label:`Currency`,type:`select`,options:[{label:`EUR`,value:`EUR`},{label:`USD`,value:`USD`}]}],initialValues:{price25:45,price50:80,currency:`EUR`},endpoint:`/storybook-api/mentor-workspace/prices`,submitLabel:`Save prices`},A={render:()=>(0,x.jsx)(y,{title:`Session prices`,description:`Set a price for each session length. This example allows 5 to 300 for 25 minutes and 10 to 600 for 50 minutes, in the selected currency.`,form:k})},j={render:()=>(0,x.jsx)(y,{title:`Session prices`,description:`The bounds in this example come from the operator configuration.`,form:{...k,initialValues:{price25:2,price50:80,currency:`EUR`}}}),play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Save prices`})),await S(t.getByText(`The example minimum is 5.`)).toBeVisible()}},M={render:()=>(0,x.jsx)(y,{title:`Draft a private session note`,description:`Summarize the agreed decisions and next steps. Sending for approval does not publish the note.`,form:{schema:m({title:d().trim().min(3,`Add a clear title.`),body:d().trim().min(20,`Include the decisions and next steps from the session.`)}),fields:[{name:`title`,label:`Note title`},{name:`body`,label:`Session note`,type:`textarea`}],initialValues:{title:`A clearer API boundary`,body:`Validate at the HTTP boundary. Keep ownership checks in the service and return a DTO. Next: add tests for the invalid-input and forbidden-access paths.`},endpoint:`/storybook-api/mentor-workspace/note`,submitLabel:`Send for approval`}})},N={render:()=>(0,x.jsxs)(`div`,{className:`dm-product-panel`,children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`h2`,{className:`dm-product-heading`,children:`Your available times`}),(0,x.jsx)(`p`,{className:`dm-product-muted`,children:`Europe/Warsaw: Booked times cannot be removed.`})]}),(0,x.jsx)(v,{columns:[{key:`date`,header:`Text session time`},{key:`status`,header:`Status`}],rows:[{id:`1`,date:`9 September, 14:00–15:00`,status:`Open`},{id:`2`,date:`9 September, 16:00–17:00`,status:`Booked`}],getRowId:e=>e.id,rowActions:e=>(0,x.jsxs)(`div`,{className:`dm-product-stack`,children:[(0,x.jsx)(u,{intent:`error`,appearance:`ghost`,size:`xs`,disabled:e.status===`Booked`,"aria-describedby":e.status===`Booked`?`booked-slot-reason`:void 0,children:`Remove time`}),e.status===`Booked`&&(0,x.jsx)(`p`,{id:`booked-slot-reason`,className:`dm-product-caption`,children:`This time has a confirmed booking.`})]})})]})},P=[`EditProfile`,`PublishAvailability`,`SetSessionPrices`,`PriceBoundsError`,`DraftPrivateNote`,`ManageAvailability`],D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <WorkspaceForm title="Your mentor profile" description="Describe what you can help with and add a link to your public work." form={profile} />
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <WorkspaceForm title="Publish a text session time" description="Enter local times in the selected timezone. The application checks conflicts before publishing." form={{
    schema: z.object({
      startsAt: z.string().min(1, 'Choose a start time.'),
      endsAt: z.string().min(1, 'Choose an end time.'),
      timeZone: z.enum(['Europe/Warsaw', 'UTC', 'America/New_York'])
    }).refine(value => value.endsAt > value.startsAt, {
      path: ['endsAt'],
      message: 'End time must be after start time.'
    }),
    fields: [{
      name: 'startsAt',
      label: 'Starts at',
      type: 'datetime-local'
    }, {
      name: 'endsAt',
      label: 'Ends at',
      type: 'datetime-local'
    }, {
      name: 'timeZone',
      label: 'Timezone',
      type: 'select',
      options: [{
        label: 'Europe/Warsaw',
        value: 'Europe/Warsaw'
      }, {
        label: 'UTC',
        value: 'UTC'
      }, {
        label: 'America/New_York',
        value: 'America/New_York'
      }]
    }],
    initialValues: {
      startsAt: '2026-09-09T14:00',
      endsAt: '2026-09-09T15:00',
      timeZone: 'Europe/Warsaw'
    },
    endpoint: '/storybook-api/mentor-workspace/availability',
    submitLabel: 'Publish availability'
  }} />
}`,...O.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <WorkspaceForm title="Session prices" description="Set a price for each session length. This example allows 5 to 300 for 25 minutes and 10 to 600 for 50 minutes, in the selected currency." form={priceForm} />
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <WorkspaceForm title="Session prices" description="The bounds in this example come from the operator configuration." form={{
    ...priceForm,
    initialValues: {
      price25: 2,
      price50: 80,
      currency: 'EUR'
    }
  }} />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save prices'
    }));
    await expect(canvas.getByText('The example minimum is 5.')).toBeVisible();
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <WorkspaceForm title="Draft a private session note" description="Summarize the agreed decisions and next steps. Sending for approval does not publish the note." form={{
    schema: z.object({
      title: z.string().trim().min(3, 'Add a clear title.'),
      body: z.string().trim().min(20, 'Include the decisions and next steps from the session.')
    }),
    fields: [{
      name: 'title',
      label: 'Note title'
    }, {
      name: 'body',
      label: 'Session note',
      type: 'textarea'
    }],
    initialValues: {
      title: 'A clearer API boundary',
      body: 'Validate at the HTTP boundary. Keep ownership checks in the service and return a DTO. Next: add tests for the invalid-input and forbidden-access paths.'
    },
    endpoint: '/storybook-api/mentor-workspace/note',
    submitLabel: 'Send for approval'
  }} />
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <div className="dm-product-panel"><div><h2 className="dm-product-heading">Your available times</h2><p className="dm-product-muted">Europe/Warsaw: Booked times cannot be removed.</p></div><DataTable columns={[{
      key: 'date',
      header: 'Text session time'
    }, {
      key: 'status',
      header: 'Status'
    }]} rows={[{
      id: '1',
      date: '9 September, 14:00–15:00',
      status: 'Open'
    }, {
      id: '2',
      date: '9 September, 16:00–17:00',
      status: 'Booked'
    }]} getRowId={row => row.id} rowActions={row => <div className="dm-product-stack"><Button intent="error" appearance="ghost" size="xs" disabled={row.status === 'Booked'} aria-describedby={row.status === 'Booked' ? 'booked-slot-reason' : undefined}>Remove time</Button>{row.status === 'Booked' && <p id="booked-slot-reason" className="dm-product-caption">This time has a confirmed booking.</p>}</div>} /></div>
}`,...N.parameters?.docs?.source}}}})))()}F();export{M as DraftPrivateNote,D as EditProfile,N as ManageAvailability,j as PriceBoundsError,O as PublishAvailability,A as SetSessionPrices,P as __namedExportsOrder,E as default};