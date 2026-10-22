import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{r,t as i}from"./button-D0p5l_4u.js";import{n as a,t as o}from"./progress-BESrJSZa.js";function s(){let[e,t]=(0,c.useState)(1);return(0,l.jsxs)(`div`,{className:`grid gap-4`,children:[(0,l.jsxs)(`p`,{className:`text-sm`,children:[`Profile setup: `,e,` of 4 steps complete`]}),(0,l.jsx)(o,{value:e,max:4,"aria-label":`Profile setup`}),(0,l.jsx)(i,{size:`sm`,onClick:()=>t(e=>e===4?0:e+1),children:e===4?`Start again`:`Complete next step`})]})}var c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{c=t(),a(),r(),l=n(),u={title:`Primitives/Progress`,component:o,tags:[`autodocs`],args:{value:60,"aria-label":`Profile completion`},decorators:[e=>(0,l.jsx)(`div`,{className:`w-full max-w-xs`,children:(0,l.jsx)(e,{})})],parameters:{docs:{description:{component:`A 6-pixel progress track. Always provide an accessible label. A numeric value is determinate; omit value for ongoing work with unknown duration. Custom max values preserve the same visual and ARIA ratio.`}}}},d={},f={args:{value:0}},p={args:{value:100}},m={args:{value:null,"aria-label":`Loading sessions`}},h={render:()=>(0,l.jsx)(s,{})},g=[`Default`,`Empty`,`Complete`,`Indeterminate`,`Steps`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    value: 0
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    value: 100
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    value: null,
    'aria-label': 'Loading sessions'
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <ProfileSteps />
}`,...h.parameters?.docs?.source}}}})))()}_();export{p as Complete,d as Default,f as Empty,m as Indeterminate,h as Steps,g as __namedExportsOrder,u as default};