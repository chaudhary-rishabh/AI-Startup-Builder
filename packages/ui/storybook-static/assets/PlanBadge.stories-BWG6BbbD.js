import{j as e}from"./jsx-runtime-Z5uAzocK.js";import{P as r}from"./PlanBadge-ghNHLQPA.js";import"./index-pP6CS22B.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./cn-BLSKlp9E.js";const R={title:"Custom/PlanBadge",component:r,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{plan:{control:{type:"select"},options:["free","pro","enterprise"]}}},a={args:{plan:"free"}},s={args:{plan:"pro"}},n={args:{plan:"enterprise"}},o={name:"All Plans in a Row",render:()=>e.jsxs("div",{className:"flex items-center gap-4 p-4",children:[e.jsx(r,{plan:"free"}),e.jsx(r,{plan:"pro"}),e.jsx(r,{plan:"enterprise"})]})},t={name:"In User Row Context",render:()=>e.jsx("div",{className:"space-y-2 rounded-card border border-divider bg-white p-4 w-72",children:[{name:"Sarah Connor",plan:"free"},{name:"John Doe",plan:"pro"},{name:"Acme Corp",plan:"enterprise"}].map(({name:p,plan:y})=>e.jsxs("div",{className:"flex items-center justify-between py-1",children:[e.jsx("span",{className:"text-sm text-brand-dark",children:p}),e.jsx(r,{plan:y})]},p))})};var c,l,m;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    plan: 'free'
  }
}`,...(m=(l=a.parameters)==null?void 0:l.docs)==null?void 0:m.source}}};var d,i,u;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    plan: 'pro'
  }
}`,...(u=(i=s.parameters)==null?void 0:i.docs)==null?void 0:u.source}}};var x,g,f;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    plan: 'enterprise'
  }
}`,...(f=(g=n.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var P,j,v;o.parameters={...o.parameters,docs:{...(P=o.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'All Plans in a Row',
  render: () => <div className="flex items-center gap-4 p-4">\r
      <PlanBadge plan="free" />\r
      <PlanBadge plan="pro" />\r
      <PlanBadge plan="enterprise" />\r
    </div>
}`,...(v=(j=o.parameters)==null?void 0:j.docs)==null?void 0:v.source}}};var b,h,w;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  name: 'In User Row Context',
  render: () => <div className="space-y-2 rounded-card border border-divider bg-white p-4 w-72">\r
      {[{
      name: 'Sarah Connor',
      plan: 'free' as const
    }, {
      name: 'John Doe',
      plan: 'pro' as const
    }, {
      name: 'Acme Corp',
      plan: 'enterprise' as const
    }].map(({
      name,
      plan
    }) => <div key={name} className="flex items-center justify-between py-1">\r
          <span className="text-sm text-brand-dark">{name}</span>\r
          <PlanBadge plan={plan} />\r
        </div>)}\r
    </div>
}`,...(w=(h=t.parameters)==null?void 0:h.docs)==null?void 0:w.source}}};const E=["Free","Pro","Enterprise","AllPlans","InUserContext"];export{o as AllPlans,n as Enterprise,a as Free,t as InUserContext,s as Pro,E as __namedExportsOrder,R as default};
