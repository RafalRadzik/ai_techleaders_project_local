import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{n as r,t as i}from"./checkbox-BnOF4Qor.js";import{n as a,t as o}from"./label-DwIsq8hb.js";function s(e){let t=(0,c.useId)();return(0,l.jsxs)(`div`,{className:`dm-control-row`,children:[(0,l.jsx)(i,{...e,id:t}),(0,l.jsx)(o,{htmlFor:t,children:`Include TypeScript`})]})}var c,l,u,d,f,p,m,h,g,_,v;function y(){return(y=e((()=>{c=t(),r(),a(),l=n(),u={title:`Primitives/Checkbox`,component:i,tags:[`autodocs`],render:e=>(0,l.jsx)(s,{...e}),parameters:{docs:{description:{component:`An independent on/off choice with checked and mixed states. Space toggles the focused control. Pair with a clickable label; use a group legend when several choices answer one question.`}}}},d={},f={args:{defaultChecked:!0}},p={args:{defaultChecked:`indeterminate`}},m={args:{size:`sm`,defaultChecked:!0}},h={args:{disabled:!0}},g={args:{disabled:!0,defaultChecked:!0}},_={args:{"aria-invalid":!0},render:e=>(0,l.jsxs)(`div`,{children:[(0,l.jsx)(s,{...e,"aria-describedby":`checkbox-example-error`}),(0,l.jsx)(`p`,{id:`checkbox-example-error`,className:`dm-field-error`,children:`Choose at least one stack.`})]})},v=[`Default`,`Checked`,`Mixed`,`Small`,`Disabled`,`DisabledChecked`,`Error`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    defaultChecked: true
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    defaultChecked: 'indeterminate'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'sm',
    defaultChecked: true
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultChecked: true
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-invalid': true
  },
  render: args => <div><CheckboxExample {...args} aria-describedby="checkbox-example-error" /><p id="checkbox-example-error" className="dm-field-error">Choose at least one stack.</p></div>
}`,..._.parameters?.docs?.source}}}})))()}y();export{f as Checked,d as Default,h as Disabled,g as DisabledChecked,_ as Error,p as Mixed,m as Small,v as __namedExportsOrder,u as default};