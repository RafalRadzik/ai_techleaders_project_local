import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./input-Ba4CrRO9.js";import{n as i,t as a}from"./FormField-BL5wf3Sf.js";var o,s,c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{i(),n(),o=t(),s={title:`Primitives/Input`,component:r,tags:[`autodocs`],args:{placeholder:`alex@example.com`,type:`email`,fieldSize:`md`},render:e=>(0,o.jsx)(`div`,{style:{width:`min(100%, 360px)`},children:(0,o.jsx)(a,{label:`Email address`,description:`Use the address associated with your account.`,children:t=>(0,o.jsx)(r,{...e,...t})})}),parameters:{docs:{description:{component:`A native input with 40, 36 and 32 px densities. Use FormField for a visible label and linked helper/error text. The native size prop remains available; fieldSize controls visual density.`}}}},c={},l={args:{defaultValue:`alex@example.com`}},u={args:{fieldSize:`sm`}},d={args:{fieldSize:`xs`}},f={args:{disabled:!0,defaultValue:`alex@example.com`}},p={args:{readOnly:!0,defaultValue:`alex@example.com`}},m={args:{type:`password`,placeholder:`Enter your password`},render:e=>(0,o.jsx)(a,{label:`Password`,required:!0,children:t=>(0,o.jsx)(r,{...e,...t,autoComplete:`current-password`})})},h={render:e=>(0,o.jsx)(a,{label:`Email address`,error:`Enter a valid email address.`,required:!0,children:t=>(0,o.jsx)(r,{...e,...t,defaultValue:`alex@`})})},g=[`Default`,`Filled`,`Small`,`Compact`,`Disabled`,`ReadOnly`,`Password`,`Error`],c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'alex@example.com'
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    fieldSize: 'sm'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    fieldSize: 'xs'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: 'alex@example.com'
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    readOnly: true,
    defaultValue: 'alex@example.com'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'password',
    placeholder: 'Enter your password'
  },
  render: args => <FormField label="Password" required>{control => <Input {...args} {...control} autoComplete="current-password" />}</FormField>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: args => <FormField label="Email address" error="Enter a valid email address." required>{control => <Input {...args} {...control} defaultValue="alex@" />}</FormField>
}`,...h.parameters?.docs?.source}}}})))()}_();export{d as Compact,c as Default,f as Disabled,h as Error,l as Filled,m as Password,p as ReadOnly,u as Small,g as __namedExportsOrder,s as default};