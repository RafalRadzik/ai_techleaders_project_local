import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{a as r,c as i,i as a,l as o,n as s,o as c,r as l,s as u,t as d}from"./select-BLXPfq2m.js";import{n as f,t as p}from"./FormField-BL5wf3Sf.js";function m({size:e=`default`,disabled:t,error:n,defaultValue:o}){let f=(0,h.useId)();return(0,g.jsx)(`div`,{style:{width:`min(100%, 360px)`},children:(0,g.jsx)(p,{label:`Stack`,id:f,description:`Choose one topic for this example.`,error:n,children:n=>(0,g.jsxs)(d,{defaultValue:o,disabled:t,children:[(0,g.jsx)(u,{...n,size:e,children:(0,g.jsx)(i,{placeholder:`Choose a stack`})}),(0,g.jsxs)(s,{position:`popper`,children:[(0,g.jsxs)(l,{children:[(0,g.jsx)(r,{children:`Languages`}),(0,g.jsx)(a,{value:`typescript`,children:`TypeScript`}),(0,g.jsx)(a,{value:`python`,children:`Python`})]}),(0,g.jsx)(c,{}),(0,g.jsxs)(l,{children:[(0,g.jsx)(r,{children:`Frameworks and tools`}),(0,g.jsx)(a,{value:`react`,children:`React`}),(0,g.jsx)(a,{value:`ai-agents`,children:`AI agents`})]})]})]})})})}var h,g,_,v,y,b,x,S,C,w,T,E,D,O;function k(){return(k=e((()=>{h=t(),f(),o(),g=n(),{expect:_,userEvent:v,within:y}=__STORYBOOK_MODULE_TEST__,b={title:`Primitives/Select`,component:m,tags:[`autodocs`],parameters:{docs:{description:{component:`A single-choice popup built with Select, Trigger, Value, Content, Group and Item. Keyboard arrows navigate, typing finds an option, Enter chooses and Escape closes. For multiple mentor stack tags, use a labeled checkbox group.`}}}},x={},S={args:{defaultValue:`react`}},C={args:{size:`sm`}},w={args:{size:`xs`}},T={args:{disabled:!0,defaultValue:`typescript`}},E={args:{error:`Choose a stack before continuing.`}},D={play:async({canvasElement:e})=>{let t=y(e),n=y(e.ownerDocument.body),r=t.getByRole(`combobox`,{name:`Stack`});r.focus(),await v.keyboard(`{ArrowDown}`),await _(await n.findByRole(`option`,{name:`TypeScript`})).toHaveFocus(),await v.keyboard(`{ArrowDown}{Enter}`),await _(r).toHaveTextContent(`Python`),await _(r).toHaveAttribute(`aria-expanded`,`false`),await _(r).toHaveFocus(),await v.keyboard(`{ArrowDown}{Escape}`),await _(r).toHaveAttribute(`aria-expanded`,`false`),await _(r).toHaveFocus()}},O=[`Default`,`Selected`,`Small`,`Compact`,`Disabled`,`Error`,`KeyboardInteraction`],x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'react'
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'sm'
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'xs'
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: 'typescript'
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    error: 'Choose a stack before continuing.'
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', {
      name: 'Stack'
    });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(await page.findByRole('option', {
      name: 'TypeScript'
    })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(trigger).toHaveTextContent('Python');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{Escape}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveFocus();
  }
}`,...D.parameters?.docs?.source}}}})))()}k();export{w as Compact,x as Default,T as Disabled,E as Error,D as KeyboardInteraction,S as Selected,C as Small,O as __namedExportsOrder,b as default};