import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{c as n,s as r}from"./cookieStore-Sbrxgkoa.js";import{i,n as a,r as o,t as s}from"./CrudForm-SWEkoGIS.js";import{n as c,t as l}from"./delay-DKK4MOFI.js";import{t as u}from"./jsx-runtime-DeHZSEgm.js";import{c as d,i as f,n as p,o as m,r as h,s as g}from"./schemas-Dn923O-v.js";function _(e){return{schema:g({[`${e}Name`]:d().min(2,`Enter at least two characters.`),[`${e}Email`]:h(`Enter a valid email address.`),[`${e}Password`]:d().min(8,`Use at least eight characters.`),[`${e}Day`]:d().min(1,`Choose a day.`),[`${e}StartsAt`]:d().min(1,`Choose a start time.`),[`${e}Price`]:m().min(5,`The example minimum is 5.`),[`${e}Bio`]:d().min(5,`Add a short introduction.`),[`${e}Updates`]:p(),[`${e}Stack`]:d().min(1,`Choose a stack.`)}),fields:[{name:`${e}Name`,label:`Display name`,placeholder:`Alex Laurent`},{name:`${e}Email`,label:`Email address`,type:`email`,placeholder:`alex@example.com`},{name:`${e}Password`,label:`Password`,type:`password`},{name:`${e}Day`,label:`Availability day`,type:`date`},{name:`${e}StartsAt`,label:`Availability starts at`,type:`datetime-local`},{name:`${e}Price`,label:`Example price`,type:`number`},{name:`${e}Bio`,label:`Introduction`,type:`textarea`},{name:`${e}Updates`,label:`Send session updates`,type:`checkbox`},{name:`${e}Stack`,label:`Stack`,type:`select`,options:[{label:`React`,value:`react`},{label:`TypeScript`,value:`typescript`},{label:`Python`,value:`python`},{label:`AI agents`,value:`ai-agents`}]}],endpoint:T(e),initialValues:{[`${e}Name`]:`Alex Laurent`,[`${e}Email`]:`alex@example.com`,[`${e}Password`]:`example-password`,[`${e}Day`]:`2026-09-08`,[`${e}StartsAt`]:`2026-09-08T14:30`,[`${e}Price`]:45,[`${e}Bio`]:`I help developers reason through concrete problems.`,[`${e}Updates`]:!0,[`${e}Stack`]:`react`},submitLabel:`Save example`,onCancel:S(),onSuccess:S()}}function v(e){let[t,n]=(0,y.useState)(!1);return(0,b.jsxs)(`div`,{className:`w-full max-w-md`,children:[(0,b.jsx)(`p`,{className:`mb-6 text-sm text-muted-foreground`,children:`Try editing the fields and saving your changes.`}),(0,b.jsx)(s,{...e,onSuccess:t=>{n(!0),e.onSuccess?.(t)}}),t&&(0,b.jsx)(`p`,{className:`mt-4 text-sm`,role:`status`,children:`Your changes have been saved.`})]})}var y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z;function B(){return(B=e((()=>{y=t(),c(),i(),n(),f(),a(),b=u(),{expect:x,fn:S,userEvent:C,within:w}=__STORYBOOK_MODULE_TEST__,T=e=>`/storybook-api/profile/${e}`,E=[o.put(T(`edit`),()=>r.json({ok:!0,data:{id:`demo-profile`}})),o.post(T(`saving`),async()=>(await l(2500),r.json({ok:!0,data:{id:`demo`}}))),o.post(T(`serverField`),()=>r.json({ok:!1,error:{code:`validation`,message:`Check your input.`,fieldErrors:{serverFieldEmail:[`This example address is already in use.`]}}},{status:422})),o.post(T(`serverError`),()=>r.json({ok:!1,error:{code:`unavailable`,message:`The example service is unavailable. Your input is preserved.`}},{status:503})),o.post(T(`network`),()=>r.error()),o.post(`/storybook-api/profile/:example`,()=>r.json({ok:!0,data:{id:`demo-profile`}}))],D={title:`Backend/Forms/CrudForm`,component:s,tags:[`autodocs`],render:e=>(0,b.jsx)(v,{...e}),args:_(`all`),parameters:{msw:{handlers:E},controls:{exclude:[`schema`,`fields`,`initialValues`,`endpoint`,`method`]},docs:{description:{component:`Schema-driven create and edit forms with text, email, password, number, date, local date-time, textarea, checkbox and select fields. Field and form errors are announced to assistive technology. Cmd/Ctrl+Enter saves; Escape cancels when no request is pending. Each instance has independent label and error IDs. Stories use local mock responses.`}}}},O={},k={args:{schema:g({day:d().min(1,`Choose a day.`),startsAt:d().min(1,`Choose a start time.`)}),fields:[{name:`day`,label:`Day`,type:`date`,required:!0},{name:`startsAt`,label:`Starts at`,type:`datetime-local`,required:!0}],initialValues:{day:`2026-09-08`,startsAt:`2026-09-08T14:30`},endpoint:T(`dates`),submitLabel:`Save availability`}},A={args:{..._(`edit`),method:`PUT`}},j={args:{..._(`validation`),initialValues:{validationName:`A`}},play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Save example`})),await x(t.getByText(`Enter at least two characters.`)).toBeVisible(),await x(t.getByRole(`textbox`,{name:`Display name`})).toHaveFocus()}},M={args:_(`saving`),play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Save example`})),await x(t.getByRole(`button`,{name:`Saving…`})).toBeDisabled()}},N={args:_(`success`),play:async({canvasElement:e,args:t})=>{let n=w(e);await C.click(n.getByRole(`button`,{name:`Save example`})),await x(await n.findByText(`Your changes have been saved.`)).toBeVisible(),await x(t.onSuccess).toHaveBeenCalled()}},P={args:_(`serverField`),play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Save example`})),await x(await t.findByText(`This example address is already in use.`)).toBeVisible()}},F={args:_(`serverError`),play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Save example`})),await x(await t.findByText(`The example service is unavailable. Your input is preserved.`)).toBeVisible()}},I={args:_(`network`),play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Save example`})),await x(await t.findByText(/failed to fetch|network.*(?:error|failed)|load failed/i)).toBeVisible()}},L={args:{schema:g({password:d().min(8),confirmation:d()}).refine(e=>e.password===e.confirmation,`The passwords must match.`),fields:[{name:`password`,label:`Password`,type:`password`},{name:`confirmation`,label:`Confirm password`,type:`password`}],initialValues:{password:`example-password`,confirmation:`different-password`},endpoint:T(`password`),submitLabel:`Change password`},play:async({canvasElement:e})=>{let t=w(e);await C.click(t.getByRole(`button`,{name:`Change password`})),await x(t.getByRole(`alert`)).toHaveTextContent(`The passwords must match.`),await x(t.getByRole(`alert`)).toHaveFocus()}},R={render:()=>(0,b.jsx)(`div`,{className:`grid w-full gap-8 md:grid-cols-2`,children:[`Primary profile`,`Alternate profile`].map(e=>(0,b.jsxs)(`section`,{children:[(0,b.jsx)(`h2`,{className:`mb-4 text-lg font-medium`,children:e}),(0,b.jsx)(s,{schema:g({name:d().min(2,`Enter your name.`)}),fields:[{name:`name`,label:`Display name`}],endpoint:T(`repeated`)})]},e))})},z=[`AllFieldTypes`,`Dates`,`Edit`,`ClientValidation`,`Saving`,`Success`,`ServerFieldErrors`,`ServerError`,`NetworkError`,`FormValidation`,`RepeatedForms`],O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    schema: z.object({
      day: z.string().min(1, 'Choose a day.'),
      startsAt: z.string().min(1, 'Choose a start time.')
    }),
    fields: [{
      name: 'day',
      label: 'Day',
      type: 'date',
      required: true
    }, {
      name: 'startsAt',
      label: 'Starts at',
      type: 'datetime-local',
      required: true
    }],
    initialValues: {
      day: '2026-09-08',
      startsAt: '2026-09-08T14:30'
    },
    endpoint: endpoint('dates'),
    submitLabel: 'Save availability'
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    ...formArgs('edit'),
    method: 'PUT'
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    ...formArgs('validation'),
    initialValues: {
      validationName: 'A'
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save example'
    }));
    await expect(canvas.getByText('Enter at least two characters.')).toBeVisible();
    await expect(canvas.getByRole('textbox', {
      name: 'Display name'
    })).toHaveFocus();
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: formArgs('saving'),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save example'
    }));
    await expect(canvas.getByRole('button', {
      name: 'Saving…'
    })).toBeDisabled();
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: formArgs('success'),
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save example'
    }));
    await expect(await canvas.findByText('Your changes have been saved.')).toBeVisible();
    await expect(args.onSuccess).toHaveBeenCalled();
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: formArgs('serverField'),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save example'
    }));
    await expect(await canvas.findByText('This example address is already in use.')).toBeVisible();
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: formArgs('serverError'),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save example'
    }));
    await expect(await canvas.findByText('The example service is unavailable. Your input is preserved.')).toBeVisible();
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  args: formArgs('network'),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Save example'
    }));
    await expect(await canvas.findByText(/failed to fetch|network.*(?:error|failed)|load failed/i)).toBeVisible();
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    schema: z.object({
      password: z.string().min(8),
      confirmation: z.string()
    }).refine(values => values.password === values.confirmation, 'The passwords must match.'),
    fields: [{
      name: 'password',
      label: 'Password',
      type: 'password'
    }, {
      name: 'confirmation',
      label: 'Confirm password',
      type: 'password'
    }],
    initialValues: {
      password: 'example-password',
      confirmation: 'different-password'
    },
    endpoint: endpoint('password'),
    submitLabel: 'Change password'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Change password'
    }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('The passwords must match.');
    await expect(canvas.getByRole('alert')).toHaveFocus();
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-full gap-8 md:grid-cols-2">
    {['Primary profile', 'Alternate profile'].map(label => <section key={label}>
      <h2 className="mb-4 text-lg font-medium">{label}</h2>
      <CrudForm schema={z.object({
        name: z.string().min(2, 'Enter your name.')
      })} fields={[{
        name: 'name',
        label: 'Display name'
      }]} endpoint={endpoint('repeated')} />
    </section>)}
  </div>
}`,...R.parameters?.docs?.source}}}})))()}B();export{O as AllFieldTypes,j as ClientValidation,k as Dates,A as Edit,L as FormValidation,I as NetworkError,R as RepeatedForms,M as Saving,F as ServerError,P as ServerFieldErrors,N as Success,z as __namedExportsOrder,D as default};