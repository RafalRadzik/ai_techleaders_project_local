import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{c as n,s as r}from"./cookieStore-Sbrxgkoa.js";import{i,n as a,r as o,t as s}from"./CrudForm-SWEkoGIS.js";import{n as c,t as l}from"./delay-DKK4MOFI.js";import{t as u}from"./jsx-runtime-DeHZSEgm.js";import{n as d,t as f}from"./code-xml-ZvE90QS_.js";import{r as p,t as m}from"./button-D0p5l_4u.js";import{c as h,i as g,r as _,s as v}from"./schemas-Dn923O-v.js";import{n as y,t as b}from"./AuthLayout-TxcEq-Ia.js";import{n as x,t as S}from"./AuthFeedback-BgL12w6F.js";function C({mode:e,schema:t,endpoint:n,initialValues:r,onSuccess:i,onGitHub:a,onSwitchMode:o,notice:c,emailDisabled:l=!1}){let[u,d]=(0,w.useState)(!1),p=e===`register`,h=[...p?[{name:`displayName`,label:`Display name`,required:!0,autoComplete:`nickname`}]:[],{name:`email`,label:`Email address`,type:`email`,required:!0,autoComplete:`email`},{name:`password`,label:`Password`,type:`password`,required:!0,autoComplete:p?`new-password`:`current-password`,description:p?`Use at least 12 characters.`:void 0}];return(0,T.jsxs)(`div`,{className:`dm-account-form`,children:[c,(0,T.jsx)(m,{type:`button`,intent:`neutral`,appearance:`stroke`,className:`dm-account-provider`,leadingIcon:(0,T.jsx)(f,{"aria-hidden":`true`}),onClick:a,disabled:u,children:`Continue with GitHub`}),(0,T.jsx)(`div`,{className:`dm-account-divider`,"aria-hidden":`true`,children:`or use your email`}),(0,T.jsxs)(`fieldset`,{className:`dm-account-email`,disabled:l,children:[(0,T.jsx)(`legend`,{className:`dm-account-legend`,children:p?`Create an account with email`:`Sign in with email`}),l&&(0,T.jsx)(`p`,{role:`status`,className:`dm-account-email-unavailable`,children:`Email sign-in and registration are currently unavailable. Continue with GitHub to use your account.`}),(0,T.jsx)(s,{schema:t,fields:h,endpoint:n,initialValues:r,submitLabel:p?`Create account`:`Sign in`,onSuccess:i,onSubmittingChange:d},e)]}),(0,T.jsxs)(`p`,{className:`dm-account-switch`,children:[(0,T.jsx)(`span`,{children:p?`Already have an account?`:`New to DevMentor?`}),(0,T.jsx)(m,{type:`button`,variant:`link`,onClick:o,disabled:u,children:p?`Sign in`:`Create account`})]})]})}var w,T;function E(){return(E=e((()=>{w=t(),d(),a(),p(),T=u(),C.__docgenInfo={description:``,methods:[],displayName:`AccountForm`,props:{mode:{required:!0,tsType:{name:`union`,raw:`'sign-in' | 'register'`,elements:[{name:`literal`,value:`'sign-in'`},{name:`literal`,value:`'register'`}]},description:``},schema:{required:!0,tsType:{name:`z.ZodType`,elements:[{name:`unknown`}],raw:`z.ZodType<unknown>`},description:`Validation and authentication policy belong to the host.`},endpoint:{required:!0,tsType:{name:`string`},description:``},initialValues:{required:!1,tsType:{name:`Record`,elements:[{name:`string`},{name:`unknown`}],raw:`Record<string, unknown>`},description:``},onSuccess:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(data: unknown) => void`,signature:{arguments:[{type:{name:`unknown`},name:`data`}],return:{name:`void`}}},description:``},onGitHub:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onSwitchMode:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},notice:{required:!1,tsType:{name:`ReactNode`},description:``},emailDisabled:{required:!1,tsType:{name:`boolean`},description:`Keep GitHub available when email authentication is disabled by the host.`,defaultValue:{value:`false`,computed:!1}}}}})))()}function D(e){let[t,n]=(0,O.useState)(null);return(0,k.jsxs)(b,{title:e.mode===`register`?`Create your account`:`Welcome back`,description:e.mode===`register`?`Book text sessions with a mentor and keep your written answers in one place.`:`Sign in to see your sessions, written answers and private notes.`,footer:(0,k.jsx)(m,{intent:`neutral`,appearance:`ghost`,onClick:j(),children:`Back to home`}),children:[(0,k.jsx)(C,{...e,onSuccess:t=>{n(e.mode===`register`?`This example accepted your registration. The next step is email verification.`:`This example accepted your sign-in details.`),e.onSuccess(t)},onGitHub:()=>{n(`The host would start GitHub sign-in here. This example stays in Storybook.`),e.onGitHub()},onSwitchMode:()=>{n(e.mode===`register`?`Open the Sign in example to try that form.`:`Open the Registration example to try that form.`),e.onSwitchMode()}}),t&&(0,k.jsx)(`p`,{className:`dm-product-callout`,role:`status`,children:t})]})}var O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{O=t(),c(),i(),n(),g(),y(),p(),E(),x(),k=u(),{expect:A,fn:j,userEvent:M,within:N}=__STORYBOOK_MODULE_TEST__,P=v({email:_(`Enter a valid email address.`),password:h().min(1,`Enter your password.`)}),F=P.extend({displayName:h().trim().min(1,`Enter your display name.`),password:h().min(12,`Use at least 12 characters.`).refine(e=>new TextEncoder().encode(e).length<=72,`This password is too long. Use fewer characters.`)}),I={email:`jordan@example.test`,password:`example-password`},L=e=>`/storybook-api/account/${e}`,R=[o.post(L(`pending`),async()=>(await l(2500),r.json({ok:!0,data:{id:`fictional-account`}}))),o.post(L(`invalid`),()=>r.json({ok:!1,error:{code:`invalid_credentials`,message:`Email or password is incorrect. Check your details and try again.`}},{status:401})),o.post(L(`duplicate`),()=>r.json({ok:!1,error:{code:`account_exists`,message:`An account already uses this email. Sign in to continue.`}},{status:409})),o.post(L(`unavailable`),()=>r.json({ok:!1,error:{code:`unavailable`,message:`We could not complete the request. Try again; your entries are still here.`}},{status:503})),o.post(`/storybook-api/account/:scenario`,()=>r.json({ok:!0,data:{id:`fictional-account`}}))],z={title:`Product/Account form`,component:C,tags:[`autodocs`],args:{mode:`sign-in`,schema:P,endpoint:L(`sign-in`),onSuccess:j(),onGitHub:j(),onSwitchMode:j()},render:e=>(0,k.jsx)(D,{...e}),parameters:{layout:`fullscreen`,msw:{handlers:R},controls:{exclude:[`schema`,`endpoint`,`initialValues`,`notice`]},docs:{description:{component:`GitHub and email account forms for E01 (#12 and #13). The host supplies validation schemas, endpoints, notices and navigation. CrudForm handles validation, pending requests and errors through apiCall. Stories use fictional accounts and local mock responses; they do not create accounts, send email or contact GitHub. Password requirements are enforced by the supplied schema.`}}}},B={},V={args:{mode:`register`,schema:F,endpoint:L(`register`)}},H={args:{emailDisabled:!0}},U={args:{notice:(0,k.jsx)(S,{state:`unverified-email`,actions:(0,k.jsx)(m,{intent:`neutral`,appearance:`stroke`,onClick:j(),children:`Resend verification email`})})}},W={args:{notice:(0,k.jsx)(S,{state:`session-expired`})}},G={args:{mode:`register`,schema:F,endpoint:L(`validation`)},play:async({canvasElement:e})=>{let t=N(e);await M.click(t.getByRole(`button`,{name:`Create account`})),await A(t.getByRole(`textbox`,{name:`Display name`})).toHaveFocus(),await A(t.getByText(`Enter your display name.`)).toBeVisible()}},K={args:{initialValues:I,endpoint:L(`pending`)},play:async({canvasElement:e})=>{let t=N(e);await M.click(t.getByRole(`button`,{name:`Sign in`})),await A(t.getByRole(`button`,{name:`Saving…`})).toBeDisabled(),await A(t.getByRole(`button`,{name:`Continue with GitHub`})).toBeDisabled(),await A(t.getByRole(`button`,{name:`Create account`})).toBeDisabled()}},q={args:{initialValues:I,endpoint:L(`success`)},play:async({canvasElement:e,args:t})=>{let n=N(e);await M.click(n.getByRole(`button`,{name:`Sign in`})),await A(await n.findByRole(`status`)).toHaveTextContent(`This example accepted your sign-in details.`),await A(t.onSuccess).toHaveBeenCalled()}},J={args:{initialValues:I,endpoint:L(`invalid`)},play:async({canvasElement:e})=>{let t=N(e);await M.click(t.getByRole(`button`,{name:`Sign in`})),await A(await t.findByRole(`alert`)).toHaveTextContent(`Email or password is incorrect.`),await A(t.getByLabelText(/^Password/)).toHaveValue(I.password)}},Y={args:{mode:`register`,schema:F,initialValues:{...I,displayName:`Jordan Lee`},endpoint:L(`duplicate`)},play:async({canvasElement:e})=>{let t=N(e);await M.click(t.getByRole(`button`,{name:`Create account`})),await A(await t.findByRole(`alert`)).toHaveTextContent(`An account already uses this email.`)}},X={args:{initialValues:I,endpoint:L(`unavailable`)},play:async({canvasElement:e})=>{let t=N(e);await M.click(t.getByRole(`button`,{name:`Sign in`})),await A(await t.findByRole(`alert`)).toHaveTextContent(`your entries are still here.`)}},Z={...V,globals:{viewport:{value:`mobile1`,isRotated:!1}}},Q=[`SignIn`,`Registration`,`EmailDisabled`,`UnverifiedEmail`,`SessionExpired`,`ClientValidation`,`Submitting`,`Success`,`InvalidCredentials`,`ExistingAccount`,`ServiceUnavailable`,`Mobile`],B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'register',
    schema: registerSchema,
    endpoint: endpoint('register')
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  args: {
    emailDisabled: true
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    notice: <AuthFeedback state="unverified-email" actions={<Button intent="neutral" appearance="stroke" onClick={fn()}>Resend verification email</Button>} />
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  args: {
    notice: <AuthFeedback state="session-expired" />
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'register',
    schema: registerSchema,
    endpoint: endpoint('validation')
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Create account'
    }));
    await expect(canvas.getByRole('textbox', {
      name: 'Display name'
    })).toHaveFocus();
    await expect(canvas.getByText('Enter your display name.')).toBeVisible();
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  args: {
    initialValues,
    endpoint: endpoint('pending')
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Sign in'
    }));
    await expect(canvas.getByRole('button', {
      name: 'Saving…'
    })).toBeDisabled();
    await expect(canvas.getByRole('button', {
      name: 'Continue with GitHub'
    })).toBeDisabled();
    await expect(canvas.getByRole('button', {
      name: 'Create account'
    })).toBeDisabled();
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  args: {
    initialValues,
    endpoint: endpoint('success')
  },
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Sign in'
    }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('This example accepted your sign-in details.');
    await expect(args.onSuccess).toHaveBeenCalled();
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  args: {
    initialValues,
    endpoint: endpoint('invalid')
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Sign in'
    }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    await expect(canvas.getByLabelText(/^Password/)).toHaveValue(initialValues.password);
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  args: {
    mode: 'register',
    schema: registerSchema,
    initialValues: {
      ...initialValues,
      displayName: 'Jordan Lee'
    },
    endpoint: endpoint('duplicate')
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Create account'
    }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('An account already uses this email.');
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    initialValues,
    endpoint: endpoint('unavailable')
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Sign in'
    }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('your entries are still here.');
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  ...Registration,
  globals: {
    viewport: {
      value: 'mobile1',
      isRotated: false
    }
  }
}`,...Z.parameters?.docs?.source}}}})))()}$();export{G as ClientValidation,H as EmailDisabled,Y as ExistingAccount,J as InvalidCredentials,Z as Mobile,V as Registration,X as ServiceUnavailable,W as SessionExpired,B as SignIn,K as Submitting,q as Success,U as UnverifiedEmail,Q as __namedExportsOrder,z as default};