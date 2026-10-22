import{n as e,r as t}from"./rolldown-runtime-DkW27tQK.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{n as r,t as i}from"./loader-circle-BkAbRZ10.js";import{n as a,t as o}from"./plus-Cbf0BrW0.js";import{r as s,t as c}from"./button-D0p5l_4u.js";var l=t({AsLink:()=>A,ClickInteraction:()=>k,Disabled:()=>E,IconOnly:()=>T,LoadingComposition:()=>D,LongLabel:()=>O,Primary:()=>b,Sizes:()=>S,StateMatrix:()=>C,Variants:()=>x,WithoutIcons:()=>w,__namedExportsOrder:()=>j,default:()=>y}),u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j;function M(){return(M=e((()=>{r(),a(),s(),u=n(),{expect:d,fn:f,userEvent:p,within:m}=__STORYBOOK_MODULE_TEST__,h=[`primary`,`neutral`,`error`],g=[`filled`,`stroke`,`lighter`,`ghost`],_=[`md`,`sm`,`xs`,`xxs`],v=({direction:e})=>(0,u.jsx)(`span`,{className:`figma-glyph figma-chevron-${e}`}),y={title:`Primitives/Button`,component:c,args:{children:`Button`,intent:`primary`,appearance:`filled`,size:`md`,disabled:!1,onClick:f(),leadingIcon:(0,u.jsx)(v,{direction:`left`}),trailingIcon:(0,u.jsx)(v,{direction:`right`})},argTypes:{intent:{control:`inline-radio`,options:h},appearance:{control:`inline-radio`,options:g},size:{control:`inline-radio`,options:_},children:{control:`text`},disabled:{control:`boolean`},iconOnly:{control:`boolean`},variant:{table:{disable:!0}},asChild:{control:!1},leadingIcon:{control:!1},trailingIcon:{control:!1}},parameters:{docs:{description:{component:`DevMentor buttons: three intents, four appearances, four heights, Inter 14/20 and leading/trailing icon slots.`}}}},b={},x={render:e=>(0,u.jsx)(`div`,{className:`ds-matrix-scroll`,children:(0,u.jsxs)(`table`,{className:`ds-button-matrix`,children:[(0,u.jsx)(`caption`,{children:`3 types × 4 styles`}),(0,u.jsx)(`thead`,{children:(0,u.jsxs)(`tr`,{children:[(0,u.jsx)(`th`,{scope:`col`,children:`Type`}),g.map(e=>(0,u.jsx)(`th`,{scope:`col`,children:e},e))]})}),(0,u.jsx)(`tbody`,{children:h.map(t=>(0,u.jsxs)(`tr`,{children:[(0,u.jsx)(`th`,{scope:`row`,children:t}),g.map(n=>(0,u.jsx)(`td`,{children:(0,u.jsx)(c,{...e,intent:t,appearance:n})},n))]},t))})]})})},S={render:e=>(0,u.jsx)(`div`,{className:`ds-size-row`,children:_.map((t,n)=>(0,u.jsxs)(`div`,{children:[(0,u.jsx)(c,{...e,size:t}),(0,u.jsx)(`p`,{children:[`Medium: 40px`,`Small: 36px`,`X-Small: 32px`,`2X-Small: 28px`][n]})]},t))})},C={parameters:{controls:{disable:!0}},render:e=>(0,u.jsx)(`div`,{className:`ds-matrix-scroll`,children:(0,u.jsxs)(`table`,{className:`ds-button-matrix`,children:[(0,u.jsx)(`caption`,{children:`Visual state specimens: use Playground for live interactions`}),(0,u.jsx)(`thead`,{children:(0,u.jsxs)(`tr`,{children:[(0,u.jsx)(`th`,{scope:`col`,children:`Type / Style`}),[`Default`,`Hover`,`Focus`,`Disabled`].map(e=>(0,u.jsx)(`th`,{scope:`col`,children:e},e))]})}),(0,u.jsx)(`tbody`,{children:h.flatMap(t=>g.map(n=>(0,u.jsxs)(`tr`,{children:[(0,u.jsxs)(`th`,{scope:`row`,children:[t,(0,u.jsx)(`span`,{children:n})]}),[`default`,`hover`,`focus`,`disabled`].map(r=>(0,u.jsx)(`td`,{children:(0,u.jsx)(c,{...e,intent:t,appearance:n,disabled:r===`disabled`,"data-preview-state":r})},r))]},t+n)))})]})})},w={args:{leadingIcon:void 0,trailingIcon:void 0,children:`Book a session`}},T={args:{iconOnly:!0,children:(0,u.jsx)(o,{"aria-hidden":`true`}),"aria-label":`Add availability`},argTypes:{children:{control:!1}}},E={args:{disabled:!0}},D={args:{disabled:!0,"aria-busy":!0,children:`Saving…`,leadingIcon:(0,u.jsx)(i,{className:`animate-spin motion-reduce:animate-none`}),trailingIcon:void 0}},O={args:{children:`Review the written answer from your mentoring session`,leadingIcon:void 0,trailingIcon:void 0}},k={parameters:{controls:{disable:!0}},play:async({canvasElement:e,args:t})=>{let n=m(e).getByRole(`button`);t.disabled?await d(n).toBeDisabled():(await p.click(n),await d(t.onClick).toHaveBeenCalled())}},A={render:e=>(0,u.jsxs)(`div`,{children:[(0,u.jsx)(c,{...e,asChild:!0,intent:`neutral`,appearance:`stroke`,children:(0,u.jsx)(`a`,{href:`#session-details`,children:(0,u.jsx)(`span`,{className:`dm-button-label`,children:`View session details`})})}),(0,u.jsxs)(`section`,{id:`session-details`,tabIndex:-1,className:`mt-8 rounded-lg border border-border p-4`,children:[(0,u.jsx)(`h2`,{className:`font-semibold`,children:`Session details`}),(0,u.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`An example destination inside this story.`})]})]})},j=[`Primary`,`Variants`,`Sizes`,`StateMatrix`,`WithoutIcons`,`IconOnly`,`Disabled`,`LoadingComposition`,`LongLabel`,`ClickInteraction`,`AsLink`],b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: args => <div className="ds-matrix-scroll"><table className="ds-button-matrix"><caption>3 types × 4 styles</caption><thead><tr><th scope="col">Type</th>{appearances.map(style => <th scope="col" key={style}>{style}</th>)}</tr></thead><tbody>{intents.map(intent => <tr key={intent}><th scope="row">{intent}</th>{appearances.map(appearance => <td key={appearance}><Button {...args} intent={intent} appearance={appearance} /></td>)}</tr>)}</tbody></table></div>
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: args => <div className="ds-size-row">{sizes.map((size, index) => <div key={size}><Button {...args} size={size} /><p>{['Medium: 40px', 'Small: 36px', 'X-Small: 32px', '2X-Small: 28px'][index]}</p></div>)}</div>
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  parameters: {
    controls: {
      disable: true
    }
  },
  render: args => <div className="ds-matrix-scroll"><table className="ds-button-matrix"><caption>Visual state specimens: use Playground for live interactions</caption><thead><tr><th scope="col">Type / Style</th>{['Default', 'Hover', 'Focus', 'Disabled'].map(state => <th scope="col" key={state}>{state}</th>)}</tr></thead><tbody>{intents.flatMap(intent => appearances.map(appearance => <tr key={intent + appearance}><th scope="row">{intent}<span>{appearance}</span></th>{['default', 'hover', 'focus', 'disabled'].map(state => <td key={state}><Button {...args} intent={intent} appearance={appearance} disabled={state === 'disabled'} data-preview-state={state} /></td>)}</tr>))}</tbody></table></div>
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    leadingIcon: undefined,
    trailingIcon: undefined,
    children: 'Book a session'
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    iconOnly: true,
    children: <Plus aria-hidden="true" />,
    'aria-label': 'Add availability'
  },
  argTypes: {
    children: {
      control: false
    }
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    'aria-busy': true,
    children: 'Saving…',
    leadingIcon: <LoaderCircle className="animate-spin motion-reduce:animate-none" />,
    trailingIcon: undefined
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Review the written answer from your mentoring session',
    leadingIcon: undefined,
    trailingIcon: undefined
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  parameters: {
    controls: {
      disable: true
    }
  },
  play: async ({
    canvasElement,
    args
  }) => {
    const button = within(canvasElement).getByRole('button');
    if (args.disabled) await expect(button).toBeDisabled();else {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalled();
    }
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: args => <div><Button {...args} asChild intent="neutral" appearance="stroke"><a href="#session-details"><span className="dm-button-label">View session details</span></a></Button><section id="session-details" tabIndex={-1} className="mt-8 rounded-lg border border-border p-4"><h2 className="font-semibold">Session details</h2><p className="text-sm text-muted-foreground">An example destination inside this story.</p></section></div>
}`,...A.parameters?.docs?.source}}}})))()}export{C as a,M as c,S as i,D as n,x as o,b as r,l as s,T as t};