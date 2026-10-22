import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{i as n,r}from"./react-Bl2r1tuC.js";import{c as i,s as a}from"./blocks-D62wjWJj.js";function o(e){let t={code:`code`,h1:`h1`,h2:`h2`,li:`li`,ol:`ol`,p:`p`,pre:`pre`,...n(),...e.components};return(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(a,{title:`Design system/Contributing`}),`
`,(0,c.jsx)(t.h1,{id:`contributing`,children:`Contributing`}),`
`,(0,c.jsxs)(t.p,{children:[`The shared package is `,(0,c.jsx)(t.code,{children:`@devmentor/ui`}),`. Its CSS contract is `,(0,c.jsx)(t.code,{children:`@devmentor/ui/tokens.css`}),`.
Use the root exports for primitives and product components, and `,(0,c.jsx)(t.code,{children:`@devmentor/ui/backend`}),`
for forms, tables, feedback and layout. The package is presentational and imports no
domain service, database or application router.`]}),`
`,(0,c.jsx)(t.h2,{id:`add-or-change-a-component`,children:`Add or change a component`}),`
`,(0,c.jsxs)(t.ol,{children:[`
`,(0,c.jsx)(t.li,{children:`Identify the screen that needs it and check whether the catalogue already has a suitable component.`}),`
`,(0,c.jsx)(t.li,{children:`Describe the problem, approach and acceptance criteria before implementing a nontrivial change.`}),`
`,(0,c.jsx)(t.li,{children:`Add a base primitive through the project’s shadcn CLI configuration; adapt its
tokens and geometry without replacing its accessible interaction model.`}),`
`,(0,c.jsxs)(t.li,{children:[`Place generic panel patterns in `,(0,c.jsx)(t.code,{children:`backend/`}),` and product-specific compositions in
the matching `,(0,c.jsx)(t.code,{children:`components/<concept>/`}),` folder. A component used by one page stays
next to that page until a second consumer appears.`]}),`
`,(0,c.jsx)(t.li,{children:`Add stories with realistic content, the states the component supports, and keyboard interactions.`}),`
`,(0,c.jsx)(t.li,{children:`Add tests beside the source and explicitly include changed production files in
the coverage configuration. The repository requires 100% statements, branches,
functions and lines per file.`}),`
`,(0,c.jsx)(t.li,{children:`Check types, lint, both builds and the changed interactions in a real browser.
Run the prototype typecheck and tests when changing its screens.`}),`
`]}),`
`,(0,c.jsx)(t.h2,{id:`component-documentation`,children:`Component documentation`}),`
`,(0,c.jsx)(t.p,{children:`Document the component's purpose, parts, props, variants, disabled/pending/error
states, keyboard behavior, responsive layout and content limits. Link its product issue.
State whether an example uses mocked data or needs an application callback.`}),`
`,(0,c.jsx)(t.h2,{id:`token-changes`,children:`Token changes`}),`
`,(0,c.jsxs)(t.p,{children:[(0,c.jsx)(t.code,{children:`tokens.css`}),` maps semantic roles onto the theme variables. Numeric foundations live
in `,(0,c.jsx)(t.code,{children:`foundations.css`}),`; component sheets consume those roles. Change a role once and
review representative forms, overlays, tables and product compositions in light
and dark. Keep primitive colors separate from action and status semantics.`]}),`
`,(0,c.jsx)(t.p,{children:`Before changing a default style, provide a component example and measured
contrast results.`}),`
`,(0,c.jsx)(t.h2,{id:`ownership-and-release`,children:`Ownership and release`}),`
`,(0,c.jsx)(t.p,{children:`Identify the proposer, design reviewer and engineering reviewer for each change.
Release notes explain what changed, who is affected and how to
migrate. Prefer adding props and keep existing aliases until their documented
deprecation period ends.`}),`
`,(0,c.jsx)(t.p,{children:`Use semantic versioning for a future published package: patch for compatible fixes,
minor for new compatible features, major for breaking public APIs. This workspace
package remains private. Publication, deployment, commits pushed to a remote and
changes to external design services require explicit user approval.`}),`
`,(0,c.jsx)(t.h2,{id:`local-commands`,children:`Local commands`}),`
`,(0,c.jsx)(t.pre,{children:(0,c.jsx)(t.code,{className:`language-sh`,children:`npm run storybook
npm run typecheck
npm run typecheck:storybook
npm run typecheck:prototype
npm run lint
npm run test:unit:coverage
npm run test:prototype
npm run build
npm run build-storybook
`})}),`
`,(0,c.jsxs)(t.p,{children:[(0,c.jsx)(t.code,{children:`storybook`}),` and `,(0,c.jsx)(t.code,{children:`build-storybook`}),` build the prototype first. The source in
`,(0,c.jsx)(t.code,{children:`prototypes/devmentor-journey/`}),` is a separate runnable preview using shared
components and local mocks. The Storybook build includes its preview files.
CI checks Storybook and the prototype alongside the application.`]}),`
`,(0,c.jsx)(t.p,{children:`Browser and integration tests supplement unit coverage. Cross-boundary features
use the project’s isolated integration harness; do not depend on a developer database.`})]})}function s(e={}){let{wrapper:t}={...n(),...e.components};return t?(0,c.jsx)(t,{...e,children:(0,c.jsx)(o,{...e})}):o(e)}var c;function l(){return(l=e((()=>{c=t(),r(),i()})))()}l();export{s as default};