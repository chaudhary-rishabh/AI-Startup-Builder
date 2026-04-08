import{j as e}from"./jsx-runtime-Z5uAzocK.js";import{r as l}from"./index-pP6CS22B.js";import{c as C}from"./cn-BLSKlp9E.js";import{c as v}from"./createLucideIcon-8pB429LH.js";import"./_commonjsHelpers-Cpj98o6Y.js";/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=v("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=v("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);function a({text:r,className:s}){const[t,i]=l.useState(!1),g=l.useCallback(async()=>{try{await navigator.clipboard.writeText(r),i(!0),setTimeout(()=>i(!1),2e3)}catch{}},[r]);return e.jsx("button",{type:"button",onClick:g,className:C("inline-flex h-8 w-8 items-center justify-center rounded-chip","text-brand-light hover:text-brand-dark hover:bg-background","transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",s),"aria-label":t?"Copied!":"Copy to clipboard",title:t?"Copied!":"Copy to clipboard",children:t?e.jsx(k,{className:"h-4 w-4 text-green-600","aria-hidden":"true"}):e.jsx(w,{className:"h-4 w-4","aria-hidden":"true"})})}try{a.displayName="CopyButton",a.__docgenInfo={description:"Icon button that copies `text` to clipboard.\nShows a Check icon for 2 seconds after a successful copy, then reverts.",displayName:"CopyButton",props:{text:{defaultValue:null,description:"",name:"text",required:!0,type:{name:"string"}},className:{defaultValue:null,description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}const T={title:"Custom/CopyButton",component:a,tags:["autodocs"],parameters:{layout:"centered"},argTypes:{text:{control:"text"}}},o={args:{text:"npm install @repo/ui"}},n={name:"In Code Block Context",render:()=>e.jsxs("div",{className:"relative flex items-center gap-2 rounded-card bg-brand-dark px-4 py-3 font-code text-sm text-white w-96",children:[e.jsx("span",{className:"flex-1",children:"pnpm turbo run build --dry"}),e.jsx(a,{text:"pnpm turbo run build --dry",className:"text-white hover:text-white/80 hover:bg-white/10"})]})},c={name:"Multiple Copy Targets",render:()=>{const r=[{label:"API Key",value:"sk_live_1234567890abcdef"},{label:"Project ID",value:"proj_abc123xyz"},{label:"Endpoint",value:"https://api.example.com"}];return e.jsx("div",{className:"space-y-3 w-80",children:r.map(({label:s,value:t})=>e.jsxs("div",{className:"flex items-center justify-between rounded-card border border-divider bg-white px-3 py-2",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-brand-light",children:s}),e.jsx("p",{className:"text-sm font-code text-brand-dark",children:t})]}),e.jsx(a,{text:t})]},s))})}};var d,p,u;o.parameters={...o.parameters,docs:{...(d=o.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    text: 'npm install @repo/ui'
  }
}`,...(u=(p=o.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var m,x,b;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  name: 'In Code Block Context',
  render: () => <div className="relative flex items-center gap-2 rounded-card bg-brand-dark px-4 py-3 font-code text-sm text-white w-96">\r
      <span className="flex-1">pnpm turbo run build --dry</span>\r
      <CopyButton text="pnpm turbo run build --dry" className="text-white hover:text-white/80 hover:bg-white/10" />\r
    </div>
}`,...(b=(x=n.parameters)==null?void 0:x.docs)==null?void 0:b.source}}};var h,y,f;c.parameters={...c.parameters,docs:{...(h=c.parameters)==null?void 0:h.docs,source:{originalSource:`{
  name: 'Multiple Copy Targets',
  render: () => {
    const snippets = [{
      label: 'API Key',
      value: 'sk_live_1234567890abcdef'
    }, {
      label: 'Project ID',
      value: 'proj_abc123xyz'
    }, {
      label: 'Endpoint',
      value: 'https://api.example.com'
    }];
    return <div className="space-y-3 w-80">\r
        {snippets.map(({
        label,
        value
      }) => <div key={label} className="flex items-center justify-between rounded-card border border-divider bg-white px-3 py-2">\r
            <div>\r
              <p className="text-xs text-brand-light">{label}</p>\r
              <p className="text-sm font-code text-brand-dark">{value}</p>\r
            </div>\r
            <CopyButton text={value} />\r
          </div>)}\r
      </div>;
  }
}`,...(f=(y=c.parameters)==null?void 0:y.docs)==null?void 0:f.source}}};const M=["Default","InCodeBlock","MultipleTokens"];export{o as Default,n as InCodeBlock,c as MultipleTokens,M as __namedExportsOrder,T as default};
