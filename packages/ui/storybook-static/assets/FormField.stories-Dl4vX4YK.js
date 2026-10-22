import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{n as r,t as i}from"./input-Ba4CrRO9.js";import{n as a,t as o}from"./textarea-CKPa35FA.js";import{n as s,t as c}from"./FormField-BL5wf3Sf.js";function l(){let[e,t]=(0,u.useState)(``);return(0,d.jsx)(c,{label:`Display name`,required:!0,description:`Visible on your profile.`,error:e.trim()?void 0:`Enter your name.`,children:n=>(0,d.jsx)(i,{...n,value:e,onChange:e=>t(e.target.value)})})}var u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{u=t(),r(),a(),s(),d=n(),{expect:f,userEvent:p,within:m}=__STORYBOOK_MODULE_TEST__,h={title:`Backend/Forms/FormField`,component:c,tags:[`autodocs`],args:{label:`Display name`,children:e=>(0,d.jsx)(i,{...e,placeholder:`Your public name`})},decorators:[e=>(0,d.jsx)(`div`,{className:`w-full max-w-md`,children:(0,d.jsx)(e,{})})],parameters:{docs:{description:{component:`Connects a field to its label, helper text and error message. Pass the supplied control props to an Input, Textarea or SelectTrigger.`}}}},g={},_={args:{required:!0,description:`Visible to developers browsing mentors.`}},v={args:{label:`Public work`,required:!0,description:`Use a public URL.`,error:`Enter a complete URL.`,children:e=>(0,d.jsx)(i,{...e,defaultValue:`github.com/`})}},y={args:{label:`Your answer`,description:`Include the reasoning behind your recommendation.`,children:e=>(0,d.jsx)(o,{...e,placeholder:`Explain your recommendation…`})}},b={render:()=>(0,d.jsx)(l,{}),play:async({canvasElement:e})=>{let t=m(e);await f(t.getByRole(`alert`)).toBeVisible(),await p.type(t.getByRole(`textbox`,{name:`Display name`}),`Ada`),await f(t.queryByRole(`alert`)).not.toBeInTheDocument()}},x=[`Default`,`Required`,`Error`,`WrittenAnswer`,`CorrectingAnError`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    required: true,
    description: 'Visible to developers browsing mentors.'
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Public work',
    required: true,
    description: 'Use a public URL.',
    error: 'Enter a complete URL.',
    children: control => <Input {...control} defaultValue="github.com/" />
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Your answer',
    description: 'Include the reasoning behind your recommendation.',
    children: control => <Textarea {...control} placeholder="Explain your recommendation…" />
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <CorrectableField />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toBeVisible();
    await userEvent.type(canvas.getByRole('textbox', {
      name: 'Display name'
    }), 'Ada');
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  }
}`,...b.parameters?.docs?.source}}}})))()}S();export{b as CorrectingAnError,g as Default,v as Error,_ as Required,y as WrittenAnswer,x as __namedExportsOrder,h as default};