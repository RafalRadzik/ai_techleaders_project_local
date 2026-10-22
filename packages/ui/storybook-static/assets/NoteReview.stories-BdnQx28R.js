import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{c as n,s as r}from"./cookieStore-Sbrxgkoa.js";import{i,n as a,r as o,t as s}from"./CrudForm-SWEkoGIS.js";import{t as c}from"./jsx-runtime-DeHZSEgm.js";import{r as l,t as u}from"./button-D0p5l_4u.js";import{s as d,t as f}from"./card-CEM6PevZ.js";import{c as p,i as m,s as h}from"./schemas-Dn923O-v.js";function g({title:e,version:t,state:n,body:r,author:i,updatedLabel:a,declineComment:o,actions:s}){let[c,l]=y[n];return(0,v.jsxs)(f,{className:`dm-product-panel dm-note-review`,children:[(0,v.jsxs)(`div`,{className:`dm-product-row`,children:[(0,v.jsxs)(`span`,{className:`dm-product-eyebrow dm-meta-group`,children:[(0,v.jsx)(`span`,{children:`Private session note`}),` `,(0,v.jsxs)(`span`,{children:[`Version `,t]})]}),(0,v.jsx)(`span`,{className:`dm-product-status`,"data-tone":l,children:c})]}),(0,v.jsx)(`h2`,{className:`dm-product-heading`,children:e}),(0,v.jsxs)(`p`,{className:`dm-product-muted dm-meta-group`,children:[(0,v.jsxs)(`span`,{children:[`By `,i]}),` `,(0,v.jsx)(`span`,{children:a})]}),(0,v.jsx)(`div`,{className:`dm-product-prose`,children:r}),o&&(0,v.jsxs)(`blockquote`,{className:`dm-product-callout`,children:[(0,v.jsx)(`strong`,{children:`Requested changes`}),(0,v.jsx)(`p`,{children:o})]}),(0,v.jsx)(`p`,{className:`dm-product-caption`,children:`This note is private. Approving it does not publish it.`}),(0,v.jsx)(`div`,{className:`dm-product-actions`,children:s})]})}function _({versions:e}){return(0,v.jsxs)(`section`,{className:`dm-product-stack`,"aria-label":`Note version history`,children:[(0,v.jsx)(`h3`,{className:`dm-product-title`,children:`Version history`}),e.length>0?(0,v.jsx)(`ol`,{className:`dm-version-history`,children:e.map(e=>(0,v.jsxs)(`li`,{children:[(0,v.jsxs)(`div`,{className:`dm-product-row`,children:[(0,v.jsxs)(`strong`,{children:[`Version `,e.version]}),(0,v.jsx)(`span`,{className:`dm-product-status`,"data-tone":y[e.state][1],children:y[e.state][0]})]}),(0,v.jsxs)(`p`,{className:`dm-product-muted dm-meta-group`,children:[(0,v.jsx)(`span`,{children:e.author}),` `,(0,v.jsx)(`time`,{dateTime:e.updatedAt,children:e.dateLabel})]}),(0,v.jsx)(`p`,{className:`dm-product-copy`,children:e.detail})]},e.version))}):(0,v.jsx)(`p`,{className:`dm-product-muted`,children:`No saved versions yet.`})]})}var v,y;function b(){return(b=e((()=>{d(),v=c(),y={draft:[`Draft`,`neutral`],"awaiting-approval":[`Awaiting approval`,`warning`],approved:[`Approved`,`success`],declined:[`Changes requested`,`error`]},g.__docgenInfo={description:``,methods:[],displayName:`NoteReview`,props:{title:{required:!0,tsType:{name:`string`},description:``},version:{required:!0,tsType:{name:`number`},description:``},state:{required:!0,tsType:{name:`union`,raw:`keyof typeof noteStates`,elements:[{name:`literal`,value:`draft`},{name:`literal`,value:`'awaiting-approval'`},{name:`literal`,value:`approved`},{name:`literal`,value:`declined`}]},description:``},body:{required:!0,tsType:{name:`ReactNode`},description:``},author:{required:!0,tsType:{name:`string`},description:``},updatedLabel:{required:!0,tsType:{name:`string`},description:``},declineComment:{required:!1,tsType:{name:`string`},description:``},actions:{required:!1,tsType:{name:`ReactNode`},description:`Compose authorized approval actions / existing CrudForm for a required decline comment.`}}},_.__docgenInfo={description:``,methods:[],displayName:`VersionHistory`,props:{versions:{required:!0,tsType:{name:`Array`,elements:[{name:`NoteVersion`}],raw:`NoteVersion[]`},description:``}}}})))()}function x(){let[e,t]=(0,S.useState)(`awaiting-approval`),[n,r]=(0,S.useState)(!1);return(0,C.jsxs)(`div`,{className:`dm-product-stack`,children:[(0,C.jsx)(g,{...D,state:e,declineComment:e===`declined`?`Your requested changes were sent in this local example.`:void 0,actions:e===`awaiting-approval`?n?(0,C.jsx)(s,{schema:O,endpoint:`/storybook-api/note-review`,fields:[{name:`comment`,label:`What should change?`,type:`textarea`,placeholder:`Describe the correction or missing context.`}],submitLabel:`Send requested changes`,onSuccess:()=>t(`declined`),onCancel:()=>r(!1)}):(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(u,{intent:`neutral`,appearance:`stroke`,onClick:()=>r(!0),children:`Request changes`}),(0,C.jsx)(u,{onClick:()=>t(`approved`),children:`Approve full note`})]}):(0,C.jsx)(`p`,{role:`status`,className:`dm-product-muted`,children:e===`approved`?`Note approved in this local example.`:`Changes requested in this local example.`})}),(0,C.jsx)(`p`,{className:`dm-product-caption`,children:`Interactive local example. No note is stored or shared.`})]})}var S,C,w,T,E,D,O,k,A,j,M,N,P,F,I;function L(){return(L=e((()=>{S=t(),i(),n(),m(),l(),a(),b(),C=c(),{expect:w,userEvent:T,within:E}=__STORYBOOK_MODULE_TEST__,D={title:`A clearer API boundary`,version:2,state:`awaiting-approval`,body:(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(`p`,{children:`We agreed to keep request validation at the HTTP boundary and ownership checks in the service.`}),(0,C.jsx)(`h3`,{className:`dm-product-title`,children:`Your next steps`}),(0,C.jsxs)(`ol`,{children:[(0,C.jsx)(`li`,{children:`Add the shared request schema.`}),(0,C.jsx)(`li`,{children:`Return a DTO from the service.`}),(0,C.jsx)(`li`,{children:`Test an invalid request and an ownership failure.`})]})]}),author:`Alex Laurent`,updatedLabel:`9 September, 15:10 Europe/Warsaw`},O=h({comment:p().trim().min(1,`Tell the mentor what needs to change.`)}),k={title:`Product/Private notes`,component:g,tags:[`autodocs`],args:D,parameters:{msw:{handlers:[o.post(`/storybook-api/note-review`,()=>r.json({ok:!0,data:{version:2}}))]},docs:{description:{component:`Private note review and version history for #28/#29. Approval is for the whole note; declining uses the existing CrudForm with a required Zod-validated comment. The caller supplies authorized actions and persists transitions. Approval never publishes a note and does not require scrolling to an arbitrary point.`}}}},A={render:()=>(0,C.jsx)(x,{})},j={render:()=>(0,C.jsx)(x,{}),play:async({canvasElement:e})=>{let t=E(e);await T.click(t.getByRole(`button`,{name:`Request changes`})),await T.click(t.getByRole(`button`,{name:`Send requested changes`})),await w(t.getByText(`Tell the mentor what needs to change.`)).toBeVisible(),await T.type(t.getByLabelText(`What should change?`),`Please include the migration constraint.`),await T.click(t.getByRole(`button`,{name:`Send requested changes`})),await w(await t.findByText(`Changes requested in this local example.`)).toBeVisible()}},M={args:{state:`draft`,actions:(0,C.jsx)(u,{children:`Edit draft`})}},N={args:{state:`approved`}},P={args:{state:`declined`,version:1,declineComment:`Please mention that we need to support the existing migration format.`,actions:(0,C.jsx)(u,{children:`Create revised version`})}},F={render:()=>(0,C.jsx)(_,{versions:[{version:2,author:`Alex Laurent`,updatedAt:`2026-09-09T13:10:00Z`,dateLabel:`9 September, 15:10`,state:`awaiting-approval`,detail:`Added the migration constraint and updated the next steps.`},{version:1,author:`Alex Laurent`,updatedAt:`2026-09-09T12:55:00Z`,dateLabel:`9 September, 14:55`,state:`declined`,detail:`Jamie requested the existing migration format as context.`}]})},I=[`Review`,`RequiredDeclineComment`,`Draft`,`Approved`,`Declined`,`History`],A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <ReviewExample />
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <ReviewExample />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Request changes'
    }));
    await userEvent.click(canvas.getByRole('button', {
      name: 'Send requested changes'
    }));
    await expect(canvas.getByText('Tell the mentor what needs to change.')).toBeVisible();
    await userEvent.type(canvas.getByLabelText('What should change?'), 'Please include the migration constraint.');
    await userEvent.click(canvas.getByRole('button', {
      name: 'Send requested changes'
    }));
    await expect(await canvas.findByText('Changes requested in this local example.')).toBeVisible();
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'draft',
    actions: <Button>Edit draft</Button>
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'approved'
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'declined',
    version: 1,
    declineComment: 'Please mention that we need to support the existing migration format.',
    actions: <Button>Create revised version</Button>
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <VersionHistory versions={[{
    version: 2,
    author: 'Alex Laurent',
    updatedAt: '2026-09-09T13:10:00Z',
    dateLabel: '9 September, 15:10',
    state: 'awaiting-approval',
    detail: 'Added the migration constraint and updated the next steps.'
  }, {
    version: 1,
    author: 'Alex Laurent',
    updatedAt: '2026-09-09T12:55:00Z',
    dateLabel: '9 September, 14:55',
    state: 'declined',
    detail: 'Jamie requested the existing migration format as context.'
  }]} />
}`,...F.parameters?.docs?.source}}}})))()}L();export{N as Approved,P as Declined,M as Draft,F as History,j as RequiredDeclineComment,A as Review,I as __namedExportsOrder,k as default};