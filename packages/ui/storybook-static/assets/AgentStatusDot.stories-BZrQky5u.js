import{j as e}from"./jsx-runtime-Z5uAzocK.js";import{c as o}from"./cn-BLSKlp9E.js";import"./index-pP6CS22B.js";import"./_commonjsHelpers-Cpj98o6Y.js";const h={idle:{bg:"bg-slate-300",label:"Idle",animate:!1},running:{bg:"bg-amber-400",label:"Running",animate:!0},done:{bg:"bg-green-500",label:"Done",animate:!1},error:{bg:"bg-red-500",label:"Error",animate:!1}};function t({status:a,className:s}){const n=h[a];return e.jsxs("span",{className:o("relative inline-flex h-2.5 w-2.5",s),role:"status","aria-label":`Agent status: ${n.label}`,children:[n.animate&&e.jsx("span",{className:o("absolute inline-flex h-full w-full rounded-full opacity-75",n.bg,"animate-ping"),"aria-hidden":"true"}),e.jsx("span",{className:o("relative inline-flex h-2.5 w-2.5 rounded-full",n.bg),"aria-hidden":"true"})]})}try{t.displayName="AgentStatusDot",t.__docgenInfo={description:`10px indicator dot with pulsing animation for running state.
Matches the agent status strip in Phase 1–6 right panels.`,displayName:"AgentStatusDot",props:{status:{defaultValue:null,description:"",name:"status",required:!0,type:{name:"enum",value:[{value:'"done"'},{value:'"idle"'},{value:'"running"'},{value:'"error"'}]}},className:{defaultValue:null,description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}const S={title:"Custom/AgentStatusDot",component:t,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{status:{control:{type:"select"},options:["idle","running","done","error"]}}},r={args:{status:"running"}},i={name:"All Statuses (running animates)",render:()=>e.jsx("div",{className:"flex items-center gap-8 p-6",children:["idle","running","done","error"].map(a=>e.jsxs("div",{className:"flex flex-col items-center gap-2",children:[e.jsx(t,{status:a}),e.jsx("span",{className:"text-xs text-brand-light capitalize",children:a})]},a))})},l={name:"In Agent Row Context",render:()=>e.jsx("div",{className:"space-y-3 rounded-card border border-divider bg-white p-4 w-80",children:[{name:"Idea Analyzer",status:"done"},{name:"Market Research",status:"running"},{name:"Validation Scorer",status:"idle"}].map(({name:a,status:s})=>e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm text-brand-dark",children:a}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(t,{status:s}),e.jsx("span",{className:"text-xs text-brand-light capitalize",children:s})]})]},a))})};var d,c,u;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    status: 'running'
  }
}`,...(u=(c=r.parameters)==null?void 0:c.docs)==null?void 0:u.source}}};var m,p,g;i.parameters={...i.parameters,docs:{...(m=i.parameters)==null?void 0:m.docs,source:{originalSource:`{
  name: 'All Statuses (running animates)',
  render: () => <div className="flex items-center gap-8 p-6">\r
      {(['idle', 'running', 'done', 'error'] as const).map(status => <div key={status} className="flex flex-col items-center gap-2">\r
          <AgentStatusDot status={status} />\r
          <span className="text-xs text-brand-light capitalize">{status}</span>\r
        </div>)}\r
    </div>
}`,...(g=(p=i.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var x,b,f;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  name: 'In Agent Row Context',
  render: () => <div className="space-y-3 rounded-card border border-divider bg-white p-4 w-80">\r
      {[{
      name: 'Idea Analyzer',
      status: 'done' as const
    }, {
      name: 'Market Research',
      status: 'running' as const
    }, {
      name: 'Validation Scorer',
      status: 'idle' as const
    }].map(({
      name,
      status
    }) => <div key={name} className="flex items-center justify-between">\r
          <span className="text-sm text-brand-dark">{name}</span>\r
          <div className="flex items-center gap-1.5">\r
            <AgentStatusDot status={status} />\r
            <span className="text-xs text-brand-light capitalize">{status}</span>\r
          </div>\r
        </div>)}\r
    </div>
}`,...(f=(b=l.parameters)==null?void 0:b.docs)==null?void 0:f.source}}};const A=["Interactive","AllStatuses","InContext"];export{i as AllStatuses,l as InContext,r as Interactive,A as __namedExportsOrder,S as default};
