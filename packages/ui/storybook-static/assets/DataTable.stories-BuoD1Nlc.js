import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{r,t as i}from"./button-D0p5l_4u.js";import{n as a,t as o}from"./DataTable-b0caO54C.js";function s(e){let[t,n]=(0,c.useState)(1);return(0,l.jsx)(o,{...e,rows:m.slice(t-1,t),pagination:{page:t,pageCount:m.length,onPageChange:n}})}var c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w;function T(){return(T=e((()=>{c=t(),r(),a(),l=n(),{expect:u,fn:d,userEvent:f,within:p}=__STORYBOOK_MODULE_TEST__,m=[{id:`demo-1`,mentor:`Alex Laurent`,topic:`React state`,duration:`25 min`,status:`Confirmed`},{id:`demo-2`,mentor:`Sam Taylor`,topic:`TypeScript generics`,duration:`50 min`,status:`Pending payment`},{id:`demo-3`,mentor:`Jordan Chen`,topic:`Python typing`,duration:`25 min`,status:`Completed`}],h={columns:[{key:`mentor`,header:`Mentor`},{key:`topic`,header:`Topic`},{key:`duration`,header:`Length`},{key:`status`,header:`Status`}],caption:`Mentoring sessions`,rows:m,getRowId:e=>e.id},g={title:`Backend/Tables/DataTable`,component:o,tags:[`autodocs`],args:h,render:e=>(0,l.jsx)(o,{...e}),parameters:{docs:{description:{component:`DataTable uses the shared feedback components for loading, error and empty states. This table has no built-in search, sorting or row selection. LongContent demonstrates wrapping and a named keyboard-scrollable region on narrow screens.`}}}},_={},v={args:{loading:!0}},y={args:{error:`We could not load your sessions. Please try again.`}},b={args:{rows:[],emptyMessage:`No confirmed sessions yet.`}},x={args:{columns:[{key:`mentor`,header:`Mentor`,render:e=>(0,l.jsx)(`strong`,{children:e.mentor})},...h.columns.slice(1)],rowActions:e=>(0,l.jsx)(i,{size:`sm`,variant:`outline`,onClick:d(),"aria-label":`View ${e.topic}`,children:`View`})}},S={render:e=>(0,l.jsx)(s,{...e}),play:async({canvasElement:e})=>{let t=p(e);await u(t.getByRole(`button`,{name:`Previous`})).toBeDisabled(),await f.click(t.getByRole(`button`,{name:`Next`})),await u(t.getByText(`Sam Taylor`)).toBeVisible(),await f.click(t.getByRole(`button`,{name:`Next`})),await u(t.getByRole(`button`,{name:`Next`})).toBeDisabled()}},C={args:{rows:[{...m[0],topic:`Tracing a TypeScript generic constraint across a deeply nested React component with a long diagnostic identifier`,mentor:`Alexandra Laurent-Szczepańska`}]}},w=[`Populated`,`Loading`,`Error`,`Empty`,`CustomCellsAndActions`,`Pagination`,`LongContent`],_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    loading: true
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    error: 'We could not load your sessions. Please try again.'
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    rows: [],
    emptyMessage: 'No confirmed sessions yet.'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    columns: [{
      key: 'mentor',
      header: 'Mentor',
      render: row => <strong>{row.mentor}</strong>
    }, ...args.columns.slice(1)],
    rowActions: row => <Button size="sm" variant="outline" onClick={fn()} aria-label={\`View \${row.topic}\`}>View</Button>
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: props => <PaginatedTable {...props} />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', {
      name: 'Previous'
    })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', {
      name: 'Next'
    }));
    await expect(canvas.getByText('Sam Taylor')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', {
      name: 'Next'
    }));
    await expect(canvas.getByRole('button', {
      name: 'Next'
    })).toBeDisabled();
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    rows: [{
      ...sessions[0]!,
      topic: 'Tracing a TypeScript generic constraint across a deeply nested React component with a long diagnostic identifier',
      mentor: 'Alexandra Laurent-Szczepańska'
    }]
  }
}`,...C.parameters?.docs?.source}}}})))()}T();export{x as CustomCellsAndActions,b as Empty,y as Error,v as Loading,C as LongContent,S as Pagination,_ as Populated,w as __namedExportsOrder,g as default};