import{j as d,a as j,g as C,s as m,_ as n,r as g,u as I,b as D,d as M,e as P}from"./index-GKI_nvxQ.js";import{c as w}from"./createSvgIcon-MbVgV0wn.js";const F=w(d.jsx("path",{d:"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"}),"Person");function N(a){return j("MuiAvatar",a)}C("MuiAvatar",["root","colorDefault","circular","rounded","square","img","fallback"]);const z=["alt","children","className","component","imgProps","sizes","src","srcSet","variant"],S=a=>{const{classes:e,variant:t,colorDefault:r}=a;return P({root:["root",t,r&&"colorDefault"],img:["img"],fallback:["fallback"]},N,e)},U=m("div",{name:"MuiAvatar",slot:"Root",overridesResolver:(a,e)=>{const{ownerState:t}=a;return[e.root,e[t.variant],t.colorDefault&&e.colorDefault]}})(({theme:a,ownerState:e})=>n({position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,width:40,height:40,fontFamily:a.typography.fontFamily,fontSize:a.typography.pxToRem(20),lineHeight:1,borderRadius:"50%",overflow:"hidden",userSelect:"none"},e.variant==="rounded"&&{borderRadius:(a.vars||a).shape.borderRadius},e.variant==="square"&&{borderRadius:0},e.colorDefault&&n({color:(a.vars||a).palette.background.default},a.vars?{backgroundColor:a.vars.palette.Avatar.defaultBg}:{backgroundColor:a.palette.mode==="light"?a.palette.grey[400]:a.palette.grey[600]}))),_=m("img",{name:"MuiAvatar",slot:"Img",overridesResolver:(a,e)=>e.img})({width:"100%",height:"100%",textAlign:"center",objectFit:"cover",color:"transparent",textIndent:1e4}),E=m(F,{name:"MuiAvatar",slot:"Fallback",overridesResolver:(a,e)=>e.fallback})({width:"75%",height:"75%"});function L({crossOrigin:a,referrerPolicy:e,src:t,srcSet:r}){const[s,l]=g.useState(!1);return g.useEffect(()=>{if(!t&&!r)return;l(!1);let i=!0;const o=new Image;return o.onload=()=>{i&&l("loaded")},o.onerror=()=>{i&&l("error")},o.crossOrigin=a,o.referrerPolicy=e,o.src=t,r&&(o.srcset=r),()=>{i=!1}},[a,e,t,r]),s}const q=g.forwardRef(function(e,t){const r=I({props:e,name:"MuiAvatar"}),{alt:s,children:l,className:i,component:o="div",imgProps:b,sizes:A,src:f,srcSet:v,variant:y="circular"}=r,R=D(r,z);let c=null;const k=L(n({},b,{src:f,srcSet:v})),h=f||v,x=h&&k!=="error",u=n({},r,{colorDefault:!x,component:o,variant:y}),p=S(u);return x?c=d.jsx(_,n({alt:s,srcSet:v,src:f,sizes:A,ownerState:u,className:p.img},b)):l!=null?c=l:h&&s?c=s[0]:c=d.jsx(E,{ownerState:u,className:p.fallback}),d.jsx(U,n({as:o,ownerState:u,className:M(p.root,i),ref:t},R,{children:c}))}),H=q;export{H as A};
