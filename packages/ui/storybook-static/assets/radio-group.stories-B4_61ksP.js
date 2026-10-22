import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{n as r,t as i}from"./label-DwIsq8hb.js";import{n as a,r as o,t as s}from"./radio-group-C5-hrqKR.js";function c(e){let t=(0,l.useId)();return(0,u.jsxs)(`fieldset`,{style:{border:0,padding:0},children:[(0,u.jsx)(`legend`,{className:`dm-field-label`,style:{marginBottom:8},children:`Session length`}),(0,u.jsxs)(s,{...e,"aria-label":`Session length`,children:[(0,u.jsxs)(`div`,{className:`dm-control-row`,children:[(0,u.jsx)(a,{id:`${t}-25`,value:`25`}),(0,u.jsx)(i,{htmlFor:`${t}-25`,children:`25 minutes`})]}),(0,u.jsxs)(`div`,{className:`dm-control-row`,children:[(0,u.jsx)(a,{id:`${t}-50`,value:`50`}),(0,u.jsx)(i,{htmlFor:`${t}-50`,children:`50 minutes`})]})]})]})}var l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{l=t(),r(),o(),u=n(),d={title:`Primitives/Radio group`,component:s,tags:[`autodocs`],render:e=>(0,u.jsx)(c,{...e}),parameters:{docs:{description:{component:`Choose one option in a named group. Tab enters the group; arrow keys move and select. Use the same group for 25/50-minute session choices rather than independent checkboxes.`}}}},f={},p={args:{defaultValue:`25`}},m={args:{disabled:!0,defaultValue:`50`}},h={args:{defaultValue:`25`,orientation:`horizontal`,style:{display:`flex`,gap:24,flexWrap:`wrap`}}},g={args:{"aria-invalid":!0},render:e=>(0,u.jsxs)(`div`,{children:[(0,u.jsx)(c,{...e,"aria-describedby":`duration-example-error`}),(0,u.jsx)(`p`,{id:`duration-example-error`,className:`dm-field-error`,children:`Choose a session length.`})]})},_=[`Default`,`Selected`,`Disabled`,`Horizontal`,`Error`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: '25'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: '50'
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: '25',
    orientation: 'horizontal',
    style: {
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap'
    }
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-invalid': true
  },
  render: args => <div><DurationOptions {...args} aria-describedby="duration-example-error" /><p id="duration-example-error" className="dm-field-error">Choose a session length.</p></div>
}`,...g.parameters?.docs?.source}}}})))()}v();export{f as Default,m as Disabled,g as Error,h as Horizontal,p as Selected,_ as __namedExportsOrder,d as default};