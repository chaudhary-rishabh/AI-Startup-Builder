import{E as y}from"./EmptyState-BPoZ_k-5.js";import"./jsx-runtime-Z5uAzocK.js";import"./index-pP6CS22B.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./cn-BLSKlp9E.js";import"./button-DLBfaVL0.js";const E={title:"Custom/EmptyState",component:y,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{title:{control:"text"},description:{control:"text"}}},t={name:"With Action Button",args:{title:"No projects yet",description:"Start by describing your idea and we'll guide you through the full build process.",action:{label:"Create your first project",onClick:()=>alert("Create clicked")}}},e={name:"Without Action Button",args:{title:"No results found",description:"Try adjusting your filters or search term to find what you're looking for."}},r={name:"Empty Search",args:{title:"No matching projects",description:`We couldn't find any projects matching "blockchain AI agent". Try a different keyword.`}},o={name:"Phase Output Missing",args:{title:"Phase 3 output not generated yet",description:"Complete Phase 2 first to unlock the Design canvas."}};var a,s,i;t.parameters={...t.parameters,docs:{...(a=t.parameters)==null?void 0:a.docs,source:{originalSource:`{
  name: 'With Action Button',
  args: {
    title: 'No projects yet',
    description: "Start by describing your idea and we'll guide you through the full build process.",
    action: {
      label: 'Create your first project',
      onClick: () => alert('Create clicked')
    }
  }
}`,...(i=(s=t.parameters)==null?void 0:s.docs)==null?void 0:i.source}}};var n,c,p;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  name: 'Without Action Button',
  args: {
    title: 'No results found',
    description: "Try adjusting your filters or search term to find what you're looking for."
  }
}`,...(p=(c=e.parameters)==null?void 0:c.docs)==null?void 0:p.source}}};var u,d,l;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  name: 'Empty Search',
  args: {
    title: "No matching projects",
    description: 'We couldn\\'t find any projects matching "blockchain AI agent". Try a different keyword.'
  }
}`,...(l=(d=r.parameters)==null?void 0:d.docs)==null?void 0:l.source}}};var m,h,g;o.parameters={...o.parameters,docs:{...(m=o.parameters)==null?void 0:m.docs,source:{originalSource:`{
  name: 'Phase Output Missing',
  args: {
    title: 'Phase 3 output not generated yet',
    description: 'Complete Phase 2 first to unlock the Design canvas.'
  }
}`,...(g=(h=o.parameters)==null?void 0:h.docs)==null?void 0:g.source}}};const W=["WithAction","WithoutAction","SearchEmpty","PhaseEmpty"];export{o as PhaseEmpty,r as SearchEmpty,t as WithAction,e as WithoutAction,W as __namedExportsOrder,E as default};
