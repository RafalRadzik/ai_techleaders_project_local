import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{a as r,i,o as a,r as o,s,t as c}from"./TechnologyChips-CSxDIJ23.js";import{r as l,t as u}from"./button-D0p5l_4u.js";import{n as d,t as f}from"./EmptyState-C-oVHQ0s.js";import{i as p,r as m,t as h}from"./MentorProfileCard-ByLavJN0.js";function g({fail:e=!1}){let[t,n]=(0,v.useState)(!1);return(0,y.jsxs)(`div`,{className:`dm-product-panel`,children:[(0,y.jsx)(`p`,{className:`dm-product-caption`,children:`Fictional completed session. This example stays in Storybook and publishes nothing.`}),t?(0,y.jsx)(`p`,{className:`dm-product-callout`,role:`status`,children:`Your demo review was saved locally.`}):(0,y.jsx)(r,{mentorName:`Alex Laurent`,onSubmit:async()=>{if(await new Promise(e=>setTimeout(e,700)),e)throw Error(`Demo save failed`);n(!0)}})]})}function _({empty:e=!1}){let[t,n]=(0,v.useState)(null);return(0,y.jsx)(h,{stacks:[`TypeScript`,`React`,`Python`],selectedStack:t,onStackChange:n,resultCount:+(!e&&t!==`Python`),empty:(0,y.jsx)(f,{title:`No mentors with this stack right now`,description:`Choose another stack or check back for new availability.`,action:(0,y.jsx)(u,{intent:`neutral`,appearance:`stroke`,onClick:()=>n(null),children:`Clear filter`})}),children:(0,y.jsx)(m,{...x.args})})}var v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P;function F(){return(F=e((()=>{v=t(),l(),d(),p(),s(),o(),y=n(),b=[{id:`demo-1`,reviewerName:`Taylor Chen`,rating:5,createdAt:`2026-09-06`,dateLabel:`6 September 2026`,text:`Alex helped me narrow a confusing TypeScript error down to one boundary. I left with a smaller example and an explanation I could use in my own code.`},{id:`demo-2`,reviewerName:`Morgan Blake`,rating:4,createdAt:`2026-09-04`,dateLabel:`4 September 2026`,text:`The trade-offs were clear and the written answer was useful. I would book a longer session next time to leave more room for follow-up questions.`},{id:`demo-3`,reviewerName:`Casey Rivera`,rating:5,createdAt:`2026-09-01`,dateLabel:`1 September 2026`,text:`We worked through my API design question together. The examples made the decision easier to explain to my team.`}],x={title:`Product/Mentors`,component:m,tags:[`autodocs`],args:{name:`Alex Laurent`,headline:`Staff engineer: developer tooling`,initials:`AL`,introduction:`I help developers design TypeScript APIs, decide what to test and keep their architecture maintainable. Bring a specific question and the context behind it.`,stacks:[`TypeScript`,`React`,`Node.js`],publicWork:[{label:`Open source contributions`,href:`https://example.com/alex/work`},{label:`Technical writing`,href:`https://example.com/alex/writing`}],availability:`Next available Wednesday, 9 September`,status:`published`,actions:(0,y.jsx)(u,{children:`Choose a time`})},parameters:{layout:`padded`,docs:{description:{component:`Mentor identity, technology icons, ratings and written reviews. All people and reviews shown here are fictional. The single-stack directory is planned for #20; it does not add ranking or search. The host checks whether a completed session is eligible for a review and saves submissions.`}}}},S={args:{rating:{average:14/3,reviewCount:3}}},C={args:{status:`draft`,availability:`No sessions published`,actions:(0,y.jsx)(u,{intent:`neutral`,appearance:`stroke`,children:`Complete profile`})}},w={args:{status:`incomplete`,publicWork:[],availability:`Add a public-work link and both session prices before publishing`,actions:(0,y.jsx)(u,{children:`Edit profile`})}},T={args:{name:`Alexandra Kowalska-Laurent`,headline:`Principal engineer working across developer experience and distributed systems`,stacks:[`TypeScript`,`React`,`Node.js`,`PostgreSQL`,`Distributed systems`],availability:`No bookable sessions at the moment`,actions:(0,y.jsx)(u,{disabled:!0,children:`Choose a time`})}},E={args:{rating:{average:14/3,reviewCount:3}},parameters:{docs:{description:{story:`Fictional demo average: ratings 5, 4 and 5 produce 4.7 from three reviews. Omit rating for legacy profiles, or use reviewCount: 0 for an explicit unrated state.`}}}},D={render:()=>(0,y.jsxs)(`div`,{className:`dm-product-panel`,children:[(0,y.jsx)(`p`,{className:`dm-product-caption`,children:`Fictional demo reviews. These are not real customer testimonials.`}),(0,y.jsx)(i,{average:14/3,reviewCount:3}),(0,y.jsx)(a,{reviews:b})]})},O={render:()=>(0,y.jsxs)(`div`,{className:`dm-product-panel`,children:[(0,y.jsx)(i,{average:0,reviewCount:0}),(0,y.jsx)(a,{reviews:[]})]})},k={render:()=>(0,y.jsx)(c,{stacks:[`TypeScript`,`React`,`Python`,`Django`,`Docker`,`Go`,`Next.js`,`Node.js`,`PostgreSQL`,`API design`,`Other technology`]}),parameters:{docs:{description:{story:`Technology chips and catalogue filters share local SVG marks. Labels stay visible, and decorative icons are hidden from screen readers. Unknown technologies use a code symbol.`}}}},A={render:()=>(0,y.jsx)(g,{}),parameters:{docs:{description:{story:`The host shows this form after an eligible completed session. Choose 1 to 5 stars with the native radio group and write a review. Submit an empty form to see required-field errors, or complete it to see the saving and success states.`}}}},j={render:()=>(0,y.jsx)(g,{fail:!0}),parameters:{docs:{description:{story:`Complete the form and submit it to see a save error. Your rating and text stay in the form so you can try again.`}}}},M={render:()=>(0,y.jsx)(_,{}),parameters:{docs:{description:{story:`Later 1.1: choose Python to see the empty result/recovery state. This local data example preserves input order.`}}}},N={render:()=>(0,y.jsx)(_,{empty:!0})},P=[`Published`,`Draft`,`Incomplete`,`LongContent`,`WithRating`,`Reviews`,`NoReviews`,`TechnologyIcons`,`WriteAReview`,`ReviewSaveError`,`Directory`,`NoDirectoryResults`],S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    rating: {
      average: 14 / 3,
      reviewCount: 3
    }
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'draft',
    availability: 'No sessions published',
    actions: <Button intent="neutral" appearance="stroke">Complete profile</Button>
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'incomplete',
    publicWork: [],
    availability: 'Add a public-work link and both session prices before publishing',
    actions: <Button>Edit profile</Button>
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    name: 'Alexandra Kowalska-Laurent',
    headline: 'Principal engineer working across developer experience and distributed systems',
    stacks: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Distributed systems'],
    availability: 'No bookable sessions at the moment',
    actions: <Button disabled>Choose a time</Button>
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    rating: {
      average: 14 / 3,
      reviewCount: 3
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Fictional demo average: ratings 5, 4 and 5 produce 4.7 from three reviews. Omit rating for legacy profiles, or use reviewCount: 0 for an explicit unrated state.'
      }
    }
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <div className="dm-product-panel"><p className="dm-product-caption">Fictional demo reviews. These are not real customer testimonials.</p><MentorRatingSummary average={14 / 3} reviewCount={3} /><MentorReviews reviews={demoReviews} /></div>
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <div className="dm-product-panel"><MentorRatingSummary average={0} reviewCount={0} /><MentorReviews reviews={[]} /></div>
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <TechnologyChips stacks={['TypeScript', 'React', 'Python', 'Django', 'Docker', 'Go', 'Next.js', 'Node.js', 'PostgreSQL', 'API design', 'Other technology']} />,
  parameters: {
    docs: {
      description: {
        story: 'Technology chips and catalogue filters share local SVG marks. Labels stay visible, and decorative icons are hidden from screen readers. Unknown technologies use a code symbol.'
      }
    }
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <ReviewFormExample />,
  parameters: {
    docs: {
      description: {
        story: 'The host shows this form after an eligible completed session. Choose 1 to 5 stars with the native radio group and write a review. Submit an empty form to see required-field errors, or complete it to see the saving and success states.'
      }
    }
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <ReviewFormExample fail />,
  parameters: {
    docs: {
      description: {
        story: 'Complete the form and submit it to see a save error. Your rating and text stay in the form so you can try again.'
      }
    }
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <DirectoryExample />,
  parameters: {
    docs: {
      description: {
        story: 'Later 1.1: choose Python to see the empty result/recovery state. This local data example preserves input order.'
      }
    }
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <DirectoryExample empty />
}`,...N.parameters?.docs?.source}}}})))()}F();export{M as Directory,C as Draft,w as Incomplete,T as LongContent,N as NoDirectoryResults,O as NoReviews,S as Published,j as ReviewSaveError,D as Reviews,k as TechnologyIcons,E as WithRating,A as WriteAReview,P as __namedExportsOrder,x as default};