import{j as a}from"./jsx-runtime-Z5uAzocK.js";import{c as N}from"./cn-BLSKlp9E.js";import"./index-pP6CS22B.js";import"./_commonjsHelpers-Cpj98o6Y.js";const j={1:{label:"Validate",bg:"bg-violet-100",text:"text-violet-800",ring:"ring-violet-200"},2:{label:"Plan",bg:"bg-blue-100",text:"text-blue-800",ring:"ring-blue-200"},3:{label:"Design",bg:"bg-purple-100",text:"text-purple-800",ring:"ring-purple-200"},4:{label:"Build",bg:"bg-teal-100",text:"text-teal-800",ring:"ring-teal-200"},5:{label:"Deploy",bg:"bg-amber-100",text:"text-amber-800",ring:"ring-amber-200"},6:{label:"Growth",bg:"bg-green-100",text:"text-green-800",ring:"ring-green-200"}};function s({phase:e,size:P="md",className:y}){const r=j[e];return a.jsxs("span",{className:N("inline-flex items-center gap-1 rounded-full font-semibold ring-1",r.bg,r.text,r.ring,P==="md"?"px-2.5 py-0.5 text-xs":"px-2 py-0.5 text-[10px]",y),"aria-label":`Phase ${e}: ${r.label}`,children:[a.jsx("span",{className:"font-bold",children:e}),a.jsx("span",{children:r.label})]})}try{s.displayName="PhaseBadge",s.__docgenInfo={description:"",displayName:"PhaseBadge",props:{phase:{defaultValue:null,description:"",name:"phase",required:!0,type:{name:"enum",value:[{value:"1"},{value:"2"},{value:"3"},{value:"4"},{value:"5"},{value:"6"}]}},size:{defaultValue:{value:"md"},description:"",name:"size",required:!1,type:{name:"enum",value:[{value:'"sm"'},{value:'"md"'}]}},className:{defaultValue:null,description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}const B={title:"Custom/PhaseBadge",component:s,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{phase:{control:{type:"select"},options:[1,2,3,4,5,6]},size:{control:{type:"radio"},options:["sm","md"]}}},l={args:{phase:1,size:"md"}},t={name:"All Phases — Medium",render:()=>a.jsx("div",{className:"flex flex-wrap gap-3 p-4",children:[1,2,3,4,5,6].map(e=>a.jsx(s,{phase:e,size:"md"},e))})},n={name:"All Phases — Small",render:()=>a.jsx("div",{className:"flex flex-wrap gap-2 p-4",children:[1,2,3,4,5,6].map(e=>a.jsx(s,{phase:e,size:"sm"},e))})},i={name:"Phase Grid (default)",render:()=>a.jsx("div",{className:"grid grid-cols-3 gap-4 p-4",children:[1,2,3,4,5,6].map(e=>a.jsxs("div",{className:"flex flex-col items-center gap-2",children:[a.jsx(s,{phase:e,size:"md"}),a.jsxs("span",{className:"text-xs text-brand-light",children:["Phase ",e]})]},e))})};var d,p,m;l.parameters={...l.parameters,docs:{...(d=l.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    phase: 1,
    size: 'md'
  }
}`,...(m=(p=l.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var o,c,g;t.parameters={...t.parameters,docs:{...(o=t.parameters)==null?void 0:o.docs,source:{originalSource:`{
  name: 'All Phases — Medium',
  render: () => <div className="flex flex-wrap gap-3 p-4">\r
      {([1, 2, 3, 4, 5, 6] as const).map(phase => <PhaseBadge key={phase} phase={phase} size="md" />)}\r
    </div>
}`,...(g=(c=t.parameters)==null?void 0:c.docs)==null?void 0:g.source}}};var u,x,h;n.parameters={...n.parameters,docs:{...(u=n.parameters)==null?void 0:u.docs,source:{originalSource:`{
  name: 'All Phases — Small',
  render: () => <div className="flex flex-wrap gap-2 p-4">\r
      {([1, 2, 3, 4, 5, 6] as const).map(phase => <PhaseBadge key={phase} phase={phase} size="sm" />)}\r
    </div>
}`,...(h=(x=n.parameters)==null?void 0:x.docs)==null?void 0:h.source}}};var b,f,v;i.parameters={...i.parameters,docs:{...(b=i.parameters)==null?void 0:b.docs,source:{originalSource:`{
  name: 'Phase Grid (default)',
  render: () => <div className="grid grid-cols-3 gap-4 p-4">\r
      {([1, 2, 3, 4, 5, 6] as const).map(phase => <div key={phase} className="flex flex-col items-center gap-2">\r
          <PhaseBadge phase={phase} size="md" />\r
          <span className="text-xs text-brand-light">Phase {phase}</span>\r
        </div>)}\r
    </div>
}`,...(v=(f=i.parameters)==null?void 0:f.docs)==null?void 0:v.source}}};const G=["Default","AllPhasesMd","AllPhasesSm","Grid"];export{t as AllPhasesMd,n as AllPhasesSm,l as Default,i as Grid,G as __namedExportsOrder,B as default};
