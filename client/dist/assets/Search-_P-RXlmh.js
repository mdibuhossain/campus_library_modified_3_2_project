import{r as l,j as s,P as C}from"./index-GKI_nvxQ.js";import{d as m}from"./Search-sNaUUObY.js";import{u as L}from"./useUtility-PP_7Ruak.js";import{B as u}from"./Box-ofb-7Xsj.js";import{P as g}from"./Paper-VLs7bu9J.js";import{B as _}from"./Button-Cvab_h2v.js";import{I as S}from"./InputBase-CL7l6VBn.js";import{C as v}from"./CircularProgress-8SwvdjS4.js";import"./interopRequireDefault-SN6WmYz-.js";import"./createSvgIcon-ADQq1O7F.js";import"./createSvgIcon-MbVgV0wn.js";import"./createBox-aGKtu-i3.js";import"./extendSxProp-9ORc9l6X.js";import"./isHostComponent-A04i3924.js";const z=()=>{const{allData:o,dataLoading:j}=L(),[e,b]=l.useState(""),[t,w]=l.useState([]);return l.useEffect(()=>{const r=o==null?void 0:o.filter(a=>{var c,d,p,x,h,n;return(((d=(c=a==null?void 0:a.book_name)==null?void 0:c.toLowerCase())==null?void 0:d.includes(e.toLowerCase()))||((x=(p=a==null?void 0:a.author)==null?void 0:p.toLowerCase())==null?void 0:x.includes(e.toLowerCase()))||((h=a==null?void 0:a.categories)==null?void 0:h.includes(e.toLowerCase()))||((n=a==null?void 0:a.subcategories)==null?void 0:n.includes(e.toLowerCase())))&&e.length>0});w(r)},[e,o]),s.jsx(C,{children:s.jsxs(u,{sx:{width:"min(90vw, 50rem)",m:"auto",mt:2},children:[s.jsxs(g,{component:"form",sx:{p:"2px 4px",display:"flex",alignItems:"center",width:"auto",m:"auto"},children:[s.jsx(_,{sx:{p:"10px"},children:s.jsx(m,{})}),s.jsx(S,{sx:{ml:1,pr:2,flex:1},placeholder:"Search",value:e,onChange:r=>{r.preventDefault(),b(r.target.value)}})]}),s.jsxs(u,{sx:{p:2,mt:2,...t.length&&{border:1,borderRadius:2,borderColor:"rgba(0, 0, 0, 0.15)"}},children:[j&&s.jsx(v,{color:"inherit"}),t.length?s.jsx("div",{children:t.map((r,a)=>s.jsx("a",{href:r==null?void 0:r.download_link,target:"_blank",rel:"noreferrer",children:s.jsxs(g,{sx:{my:2,p:2,color:"rgba(0, 0, 0, 0.7)"},children:[s.jsx("strong",{children:r==null?void 0:r.book_name}),s.jsxs("p",{className:"text-blue-500 font-semibold text-sm",children:[r!=null&&r.edition?(r==null?void 0:r.edition)+"E":""," ",s.jsx("em",{children:r!=null&&r.author?" - "+(r==null?void 0:r.author):""})," ",s.jsxs("span",{style:{color:"rgba(0, 0, 0, 0.7)"},children:["(",r==null?void 0:r.categories,")"]})]})]})},a))}):""]})]})})};export{z as default};
