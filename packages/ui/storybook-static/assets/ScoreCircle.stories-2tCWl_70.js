import{j as r}from"./jsx-runtime-Z5uAzocK.js";import{c as L}from"./cn-BLSKlp9E.js";import"./index-pP6CS22B.js";import"./_commonjsHelpers-Cpj98o6Y.js";function M(s){return s>=70?"#16A34A":s>=40?"#D97706":"#DC2626"}function m({score:s,size:e=96,className:p}){const a=Math.min(100,Math.max(0,s)),u=(e-12)/2,f=2*Math.PI*u,F=f-a/100*f,G=M(a),g=e/2,h=e/2;return r.jsxs("div",{className:L("relative inline-flex items-center justify-center",p),style:{width:e,height:e},role:"meter","aria-valuenow":a,"aria-valuemin":0,"aria-valuemax":100,"aria-label":`Demand score: ${a} out of 100`,children:[r.jsxs("svg",{width:e,height:e,viewBox:`0 0 ${e} ${e}`,className:"-rotate-90","aria-hidden":"true",children:[r.jsx("circle",{cx:g,cy:h,r:u,fill:"none",stroke:"#E8DFD0",strokeWidth:8}),r.jsx("circle",{cx:g,cy:h,r:u,fill:"none",stroke:G,strokeWidth:8,strokeLinecap:"round",strokeDasharray:f,strokeDashoffset:F,className:"transition-[stroke-dashoffset] duration-1000 ease-out",style:{"--tw-enter-opacity":1}})]}),r.jsxs("span",{className:"absolute flex flex-col items-center",style:{color:"#5C4425"},children:[r.jsx("span",{className:"font-bold font-display leading-none",style:{fontSize:e*.26},children:a}),r.jsx("span",{className:"text-brand-light font-body",style:{fontSize:e*.12},children:"/100"})]})]})}try{m.displayName="ScoreCircle",m.__docgenInfo={description:`Animated SVG circle that draws clockwise from 0 to score on mount.
Shows score number and color-coded ring based on demand score bands.`,displayName:"ScoreCircle",props:{score:{defaultValue:null,description:"",name:"score",required:!0,type:{name:"number"}},size:{defaultValue:{value:"96"},description:"",name:"size",required:!1,type:{name:"number"}},className:{defaultValue:null,description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}const O={title:"Custom/ScoreCircle",component:m,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{score:{control:{type:"range",min:0,max:100,step:1}},size:{control:{type:"number",min:48,max:200,step:8}}}},o={args:{score:72,size:96}},c={name:"Score Threshold Bands (0 / 40 / 70 / 100)",render:()=>r.jsx("div",{className:"flex items-end gap-8 p-6",children:[{score:0,label:"Red (<40)",size:80},{score:40,label:"Amber (40)",size:80},{score:70,label:"Green (70)",size:80},{score:100,label:"Perfect",size:80}].map(({score:s,label:e,size:p})=>r.jsxs("div",{className:"flex flex-col items-center gap-2",children:[r.jsx(m,{score:s,size:p}),r.jsx("span",{className:"text-xs text-brand-light",children:e})]},s))})},t={args:{score:0,size:96}},n={args:{score:40,size:96}},i={args:{score:70,size:96}},l={args:{score:100,size:96}},d={args:{score:82,size:160}};var x,S,y;o.parameters={...o.parameters,docs:{...(x=o.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    score: 72,
    size: 96
  }
}`,...(y=(S=o.parameters)==null?void 0:S.docs)==null?void 0:y.source}}};var b,z,v;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`{
  name: 'Score Threshold Bands (0 / 40 / 70 / 100)',
  render: () => <div className="flex items-end gap-8 p-6">\r
      {[{
      score: 0,
      label: 'Red (<40)',
      size: 80
    }, {
      score: 40,
      label: 'Amber (40)',
      size: 80
    }, {
      score: 70,
      label: 'Green (70)',
      size: 80
    }, {
      score: 100,
      label: 'Perfect',
      size: 80
    }].map(({
      score,
      label,
      size
    }) => <div key={score} className="flex flex-col items-center gap-2">\r
          <ScoreCircle score={score} size={size} />\r
          <span className="text-xs text-brand-light">{label}</span>\r
        </div>)}\r
    </div>
}`,...(v=(z=c.parameters)==null?void 0:z.docs)==null?void 0:v.source}}};var N,j,k;t.parameters={...t.parameters,docs:{...(N=t.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    score: 0,
    size: 96
  }
}`,...(k=(j=t.parameters)==null?void 0:j.docs)==null?void 0:k.source}}};var _,C,w;n.parameters={...n.parameters,docs:{...(_=n.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    score: 40,
    size: 96
  }
}`,...(w=(C=n.parameters)==null?void 0:C.docs)==null?void 0:w.source}}};var D,A,B;i.parameters={...i.parameters,docs:{...(D=i.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    score: 70,
    size: 96
  }
}`,...(B=(A=i.parameters)==null?void 0:A.docs)==null?void 0:B.source}}};var P,T,I;l.parameters={...l.parameters,docs:{...(P=l.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    score: 100,
    size: 96
  }
}`,...(I=(T=l.parameters)==null?void 0:T.docs)==null?void 0:I.source}}};var V,q,E;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    score: 82,
    size: 160
  }
}`,...(E=(q=d.parameters)==null?void 0:q.docs)==null?void 0:E.source}}};const H=["Interactive","ThresholdBands","ScoreZero","ScoreForty","ScoreSeventy","ScorePerfect","LargeSize"];export{o as Interactive,d as LargeSize,n as ScoreForty,l as ScorePerfect,i as ScoreSeventy,t as ScoreZero,c as ThresholdBands,H as __namedExportsOrder,O as default};
