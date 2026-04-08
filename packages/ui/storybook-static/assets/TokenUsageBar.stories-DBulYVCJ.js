import{j as e}from"./jsx-runtime-Z5uAzocK.js";import{c as m}from"./cn-BLSKlp9E.js";import"./index-pP6CS22B.js";import"./_commonjsHelpers-Cpj98o6Y.js";function c(r){return r>=1e6?`${(r/1e6).toFixed(1)}M`:r>=1e3?`${(r/1e3).toFixed(0)}K`:String(r)}function B(r){return r>95?"bg-red-500":r>80?"bg-amber-400":"bg-green-500"}function L(r){return r>95?"text-red-600":r>80?"text-amber-600":"text-green-700"}function s({used:r,limit:d,className:C}){const a=Math.min(100,Math.round(r/(d===0?1:d)*100)),S=B(a),U=L(a);return e.jsxs("div",{className:m("space-y-1",C),children:[e.jsxs("div",{className:"flex items-center justify-between text-xs",children:[e.jsxs("span",{className:"text-brand-light font-body",children:[c(r)," / ",c(d)," tokens"]}),e.jsxs("span",{className:m("font-semibold",U),children:[a,"%"]})]}),e.jsx("div",{className:"h-2 w-full overflow-hidden rounded-full bg-divider",role:"meter","aria-valuenow":a,"aria-valuemin":0,"aria-valuemax":100,"aria-label":`Token usage: ${a}%`,children:e.jsx("div",{className:m("h-full rounded-full transition-all duration-500 ease-out",S),style:{width:`${a}%`}})})]})}try{s.displayName="TokenUsageBar",s.__docgenInfo={description:`Horizontal token consumption bar.
Colors: <80% → green, 80-95% → amber, >95% → red.
Shows formatted used/limit values and percentage.`,displayName:"TokenUsageBar",props:{used:{defaultValue:null,description:"",name:"used",required:!0,type:{name:"number"}},limit:{defaultValue:null,description:"",name:"limit",required:!0,type:{name:"number"}},className:{defaultValue:null,description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}const M={title:"Custom/TokenUsageBar",component:s,tags:["autodocs"],parameters:{layout:"padded"},argTypes:{used:{control:{type:"range",min:0,max:1e6,step:1e4}},limit:{control:{type:"range",min:5e4,max:1e6,step:5e4}}}},t={args:{used:125e3,limit:5e5}},n={name:"Low Usage (< 80%) — Green",args:{used:25e3,limit:5e5}},i={name:"Warning (80–95%) — Amber",args:{used:42e4,limit:5e5}},o={name:"Critical (> 95%) — Red",args:{used:49e4,limit:5e5}},l={name:"All Three Threshold States",render:()=>e.jsxs("div",{className:"space-y-6 w-80 p-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-brand-light mb-2",children:"Low (25k / 500k)"}),e.jsx(s,{used:25e3,limit:5e5})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-brand-light mb-2",children:"Warning (420k / 500k)"}),e.jsx(s,{used:42e4,limit:5e5})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-brand-light mb-2",children:"Critical (490k / 500k)"}),e.jsx(s,{used:49e4,limit:5e5})]})]})};var u,p,g;t.parameters={...t.parameters,docs:{...(u=t.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    used: 125_000,
    limit: 500_000
  }
}`,...(g=(p=t.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var x,h,f;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  name: 'Low Usage (< 80%) — Green',
  args: {
    used: 25_000,
    limit: 500_000
  }
}`,...(f=(h=n.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};var b,v,_;i.parameters={...i.parameters,docs:{...(b=i.parameters)==null?void 0:b.docs,source:{originalSource:`{
  name: 'Warning (80–95%) — Amber',
  args: {
    used: 420_000,
    limit: 500_000
  }
}`,...(_=(v=i.parameters)==null?void 0:v.docs)==null?void 0:_.source}}};var k,j,N;o.parameters={...o.parameters,docs:{...(k=o.parameters)==null?void 0:k.docs,source:{originalSource:`{
  name: 'Critical (> 95%) — Red',
  args: {
    used: 490_000,
    limit: 500_000
  }
}`,...(N=(j=o.parameters)==null?void 0:j.docs)==null?void 0:N.source}}};var y,T,w;l.parameters={...l.parameters,docs:{...(y=l.parameters)==null?void 0:y.docs,source:{originalSource:`{
  name: 'All Three Threshold States',
  render: () => <div className="space-y-6 w-80 p-4">\r
      <div>\r
        <p className="text-xs text-brand-light mb-2">Low (25k / 500k)</p>\r
        <TokenUsageBar used={25_000} limit={500_000} />\r
      </div>\r
      <div>\r
        <p className="text-xs text-brand-light mb-2">Warning (420k / 500k)</p>\r
        <TokenUsageBar used={420_000} limit={500_000} />\r
      </div>\r
      <div>\r
        <p className="text-xs text-brand-light mb-2">Critical (490k / 500k)</p>\r
        <TokenUsageBar used={490_000} limit={500_000} />\r
      </div>\r
    </div>
}`,...(w=(T=l.parameters)==null?void 0:T.docs)==null?void 0:w.source}}};const R=["Interactive","Low","Warning","Critical","AllThresholds"];export{l as AllThresholds,o as Critical,t as Interactive,n as Low,i as Warning,R as __namedExportsOrder,M as default};
