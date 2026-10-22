import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{r as n,t as r}from"./button-D0p5l_4u.js";import{n as i,r as a,t as o}from"./WrittenAnswer-BQca0aVo.js";var s,c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{n(),a(),s=t(),c={title:`Product/Written answer and transcript`,component:i,tags:[`autodocs`],args:{state:`posted`,mentorName:`Alex Laurent`,body:(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(`p`,{children:`Keep validation at the HTTP boundary, then pass a typed command into the service. This makes the domain function independent of the request format.`}),(0,s.jsxs)(`ol`,{children:[(0,s.jsx)(`li`,{children:`Validate the incoming shape with the shared schema.`}),(0,s.jsx)(`li`,{children:`Return a small DTO rather than an ORM entity.`}),(0,s.jsx)(`li`,{children:`Cover the error and success paths at the boundary.`})]}),(0,s.jsx)(`pre`,{children:(0,s.jsx)(`code`,{children:`type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };`})})]}),publishedLabel:`Posted 9 September 2026 at 14:40 Europe/Warsaw`,actions:(0,s.jsx)(r,{intent:`neutral`,appearance:`stroke`,children:`Review private session note`})},parameters:{docs:{description:{component:`Written answer for #27 and a transcript composition for #26. The caller identifies its own messages with isOwn and supplies the composer. Names remain visible, own messages sit on the right, and received messages sit on the left. Message history can scroll with the keyboard and keeps its reading position when messages change. These examples use fictional messages; delivery transport and session-channel decision Q18 remain outside this component. Published answers have no Edit action while replacement policy is unresolved.`}}}},l={},u={args:{state:`owed`,publishedLabel:void 0,actions:void 0}},d={render:()=>(0,s.jsx)(o,{messages:[{id:`1`,author:`Jamie Chen`,sentAt:`2026-09-09T12:01:00Z`,timeLabel:`14:01`,body:(0,s.jsx)(`p`,{children:`Where should I validate an API request before saving it?`}),delivery:`sent`,isOwn:!0},{id:`2`,author:`Alex Laurent`,sentAt:`2026-09-09T12:02:00Z`,timeLabel:`14:02`,body:(0,s.jsx)(`p`,{children:`At the HTTP boundary. What constraints does the service need to enforce independently?`}),delivery:`sent`}],composer:(0,s.jsx)(`p`,{className:`dm-product-callout`,children:`The text session has ended. Read the mentor's written answer when it is posted.`})})},f={render:()=>(0,s.jsx)(o,{messages:[{id:`1`,author:`Jamie Chen`,sentAt:`2026-09-09T12:03:00Z`,timeLabel:`14:03`,body:(0,s.jsx)(`p`,{children:`I can share a small example.`}),delivery:`sending`,isOwn:!0},{id:`2`,author:`Jamie Chen`,sentAt:`2026-09-09T12:04:00Z`,timeLabel:`14:04`,body:(0,s.jsx)(`p`,{children:`The service also checks ownership.`}),delivery:`failed`,isOwn:!0,actions:(0,s.jsx)(r,{intent:`neutral`,appearance:`stroke`,size:`xs`,children:`Retry message`})}],composer:(0,s.jsx)(`p`,{className:`dm-product-caption`,children:`Composer and delivery transport are supplied by the chosen session channel.`})})},p={render:()=>(0,s.jsx)(o,{messages:[],emptyMessage:`Your text session starts on 9 September at 14:00 Europe/Warsaw.`,composer:(0,s.jsx)(r,{disabled:!0,children:`Session has not started`})})},m={render:()=>(0,s.jsx)(o,{messages:[{id:`1`,author:`Jamie Chen`,sentAt:`2026-09-09T12:05:00Z`,timeLabel:`14:05`,body:`The caller checks data and error separately.
Can I keep the current return values?`,delivery:`sent`,isOwn:!0},{id:`2`,author:`Alex Laurent`,sentAt:`2026-09-09T12:06:00Z`,timeLabel:`14:06`,body:(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(`p`,{children:`Yes. Add an explicit result type, then update one caller before migrating the rest.`}),(0,s.jsx)(`pre`,{children:(0,s.jsx)(`code`,{children:`type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

if (result.ok) {
  return result.data;
}`})}),(0,s.jsx)(`p`,{children:`The error branch can then handle the failure without checking data again.`})]}),delivery:`sent`}],composer:null})},h={render:()=>(0,s.jsx)(o,{messages:[{id:`1`,author:`Jamie Chen`,sentAt:`2026-09-09T12:01:00Z`,timeLabel:`14:01`,body:`My API result has optional data and error fields. Every caller checks both.`,delivery:`sent`,isOwn:!0},{id:`2`,author:`Alex Laurent`,sentAt:`2026-09-09T12:02:00Z`,timeLabel:`14:02`,body:`Can you share one caller and the result type?`,delivery:`sent`},{id:`3`,author:`Jamie Chen`,sentAt:`2026-09-09T12:03:00Z`,timeLabel:`14:03`,body:(0,s.jsx)(`pre`,{children:(0,s.jsx)(`code`,{children:`type Result = {
  data?: User;
  error?: AppError;
};`})}),delivery:`sent`,isOwn:!0},{id:`4`,author:`Alex Laurent`,sentAt:`2026-09-09T12:04:00Z`,timeLabel:`14:04`,body:`This allows both fields to be missing. A union makes success and failure separate cases.`,delivery:`sent`},{id:`5`,author:`Jamie Chen`,sentAt:`2026-09-09T12:05:00Z`,timeLabel:`14:05`,body:`There are several existing consumers. I need to migrate them one at a time.`,delivery:`sent`,isOwn:!0},{id:`6`,author:`Alex Laurent`,sentAt:`2026-09-09T12:06:00Z`,timeLabel:`14:06`,body:`Start with an adapter for the old result. You can remove it once the callers accept the union.`,delivery:`sent`},{id:`7`,author:`Jamie Chen`,sentAt:`2026-09-09T12:07:00Z`,timeLabel:`14:07`,body:`One test includes this long identifier:
request_9c45982dd5104e58ac19c45982dd5104e58ac19c45982dd5104e58ac19c45982dd5104e58ac1`,delivery:`sent`,isOwn:!0},{id:`8`,author:`Alex Laurent`,sentAt:`2026-09-09T12:08:00Z`,timeLabel:`14:08`,body:`Keep that test. Add a case where the old result contains neither field so the adapter handles it explicitly.`,delivery:`sent`}],composer:(0,s.jsx)(`p`,{className:`dm-product-callout`,children:`Session ended. Your written answer is available in session details.`})})},g=[`Posted`,`AwaitingAnswer`,`TextTranscript`,`DeliveryStates`,`BeforeSession`,`CodeAndLineBreaks`,`LongConversation`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    state: 'owed',
    publishedLabel: undefined,
    actions: undefined
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <SessionTranscript messages={[{
    id: '1',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:01:00Z',
    timeLabel: '14:01',
    body: <p>Where should I validate an API request before saving it?</p>,
    delivery: 'sent',
    isOwn: true
  }, {
    id: '2',
    author: 'Alex Laurent',
    sentAt: '2026-09-09T12:02:00Z',
    timeLabel: '14:02',
    body: <p>At the HTTP boundary. What constraints does the service need to enforce independently?</p>,
    delivery: 'sent'
  }]} composer={<p className="dm-product-callout">The text session has ended. Read the mentor&apos;s written answer when it is posted.</p>} />
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <SessionTranscript messages={[{
    id: '1',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:03:00Z',
    timeLabel: '14:03',
    body: <p>I can share a small example.</p>,
    delivery: 'sending',
    isOwn: true
  }, {
    id: '2',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:04:00Z',
    timeLabel: '14:04',
    body: <p>The service also checks ownership.</p>,
    delivery: 'failed',
    isOwn: true,
    actions: <Button intent="neutral" appearance="stroke" size="xs">Retry message</Button>
  }]} composer={<p className="dm-product-caption">Composer and delivery transport are supplied by the chosen session channel.</p>} />
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <SessionTranscript messages={[]} emptyMessage="Your text session starts on 9 September at 14:00 Europe/Warsaw." composer={<Button disabled>Session has not started</Button>} />
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <SessionTranscript messages={[{
    id: '1',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:05:00Z',
    timeLabel: '14:05',
    body: 'The caller checks data and error separately.\\nCan I keep the current return values?',
    delivery: 'sent',
    isOwn: true
  }, {
    id: '2',
    author: 'Alex Laurent',
    sentAt: '2026-09-09T12:06:00Z',
    timeLabel: '14:06',
    body: <><p>Yes. Add an explicit result type, then update one caller before migrating the rest.</p><pre><code>{'type Result<T> =\\n  | { ok: true; data: T }\\n  | { ok: false; error: AppError };\\n\\nif (result.ok) {\\n  return result.data;\\n}'}</code></pre><p>The error branch can then handle the failure without checking data again.</p></>,
    delivery: 'sent'
  }]} composer={null} />
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <SessionTranscript messages={[{
    id: '1',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:01:00Z',
    timeLabel: '14:01',
    body: 'My API result has optional data and error fields. Every caller checks both.',
    delivery: 'sent',
    isOwn: true
  }, {
    id: '2',
    author: 'Alex Laurent',
    sentAt: '2026-09-09T12:02:00Z',
    timeLabel: '14:02',
    body: 'Can you share one caller and the result type?',
    delivery: 'sent'
  }, {
    id: '3',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:03:00Z',
    timeLabel: '14:03',
    body: <pre><code>{'type Result = {\\n  data?: User;\\n  error?: AppError;\\n};'}</code></pre>,
    delivery: 'sent',
    isOwn: true
  }, {
    id: '4',
    author: 'Alex Laurent',
    sentAt: '2026-09-09T12:04:00Z',
    timeLabel: '14:04',
    body: 'This allows both fields to be missing. A union makes success and failure separate cases.',
    delivery: 'sent'
  }, {
    id: '5',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:05:00Z',
    timeLabel: '14:05',
    body: 'There are several existing consumers. I need to migrate them one at a time.',
    delivery: 'sent',
    isOwn: true
  }, {
    id: '6',
    author: 'Alex Laurent',
    sentAt: '2026-09-09T12:06:00Z',
    timeLabel: '14:06',
    body: 'Start with an adapter for the old result. You can remove it once the callers accept the union.',
    delivery: 'sent'
  }, {
    id: '7',
    author: 'Jamie Chen',
    sentAt: '2026-09-09T12:07:00Z',
    timeLabel: '14:07',
    body: 'One test includes this long identifier:\\nrequest_9c45982dd5104e58ac19c45982dd5104e58ac19c45982dd5104e58ac19c45982dd5104e58ac1',
    delivery: 'sent',
    isOwn: true
  }, {
    id: '8',
    author: 'Alex Laurent',
    sentAt: '2026-09-09T12:08:00Z',
    timeLabel: '14:08',
    body: 'Keep that test. Add a case where the old result contains neither field so the adapter handles it explicitly.',
    delivery: 'sent'
  }]} composer={<p className="dm-product-callout">Session ended. Your written answer is available in session details.</p>} />
}`,...h.parameters?.docs?.source}}}})))()}_();export{u as AwaitingAnswer,p as BeforeSession,m as CodeAndLineBreaks,f as DeliveryStates,h as LongConversation,l as Posted,d as TextTranscript,g as __namedExportsOrder,c as default};