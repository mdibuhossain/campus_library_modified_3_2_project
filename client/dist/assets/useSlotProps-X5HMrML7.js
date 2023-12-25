import{_ as i,d as M,b as O}from"./index-GKI_nvxQ.js";import{i as L}from"./isHostComponent-A04i3924.js";import{e as j}from"./createSvgIcon-MbVgV0wn.js";var t={};/**
 * @license React
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var N=Symbol.for("react.element"),E=Symbol.for("react.portal"),d=Symbol.for("react.fragment"),m=Symbol.for("react.strict_mode"),p=Symbol.for("react.profiler"),y=Symbol.for("react.provider"),S=Symbol.for("react.context"),z=Symbol.for("react.server_context"),v=Symbol.for("react.forward_ref"),P=Symbol.for("react.suspense"),b=Symbol.for("react.suspense_list"),$=Symbol.for("react.memo"),g=Symbol.for("react.lazy"),A=Symbol.for("react.offscreen"),H;H=Symbol.for("react.module.reference");function l(e){if(typeof e=="object"&&e!==null){var o=e.$$typeof;switch(o){case N:switch(e=e.type,e){case d:case p:case m:case P:case b:return e;default:switch(e=e&&e.$$typeof,e){case z:case S:case v:case g:case $:case y:return e;default:return o}}case E:return o}}}t.ContextConsumer=S;t.ContextProvider=y;t.Element=N;t.ForwardRef=v;t.Fragment=d;t.Lazy=g;t.Memo=$;t.Portal=E;t.Profiler=p;t.StrictMode=m;t.Suspense=P;t.SuspenseList=b;t.isAsyncMode=function(){return!1};t.isConcurrentMode=function(){return!1};t.isContextConsumer=function(e){return l(e)===S};t.isContextProvider=function(e){return l(e)===y};t.isElement=function(e){return typeof e=="object"&&e!==null&&e.$$typeof===N};t.isForwardRef=function(e){return l(e)===v};t.isFragment=function(e){return l(e)===d};t.isLazy=function(e){return l(e)===g};t.isMemo=function(e){return l(e)===$};t.isPortal=function(e){return l(e)===E};t.isProfiler=function(e){return l(e)===p};t.isStrictMode=function(e){return l(e)===m};t.isSuspense=function(e){return l(e)===P};t.isSuspenseList=function(e){return l(e)===b};t.isValidElementType=function(e){return typeof e=="string"||typeof e=="function"||e===d||e===p||e===m||e===P||e===b||e===A||typeof e=="object"&&e!==null&&(e.$$typeof===g||e.$$typeof===$||e.$$typeof===y||e.$$typeof===S||e.$$typeof===v||e.$$typeof===H||e.getModuleId!==void 0)};t.typeOf=l;function W(e,o,n){return e===void 0||L(e)?o:i({},o,{ownerState:i({},o.ownerState,n)})}function I(e,o=[]){if(e===void 0)return{};const n={};return Object.keys(e).filter(r=>r.match(/^on[A-Z]/)&&typeof e[r]=="function"&&!o.includes(r)).forEach(r=>{n[r]=e[r]}),n}function T(e,o,n){return typeof e=="function"?e(o,n):e}function F(e){if(e===void 0)return{};const o={};return Object.keys(e).filter(n=>!(n.match(/^on[A-Z]/)&&typeof e[n]=="function")).forEach(n=>{o[n]=e[n]}),o}function Z(e){const{getSlotProps:o,additionalProps:n,externalSlotProps:r,externalForwardedProps:s,className:f}=e;if(!o){const k=M(n==null?void 0:n.className,f,s==null?void 0:s.className,r==null?void 0:r.className),R=i({},n==null?void 0:n.style,s==null?void 0:s.style,r==null?void 0:r.style),_=i({},n,s,r);return k.length>0&&(_.className=k),Object.keys(R).length>0&&(_.style=R),{props:_,internalRef:void 0}}const x=I(i({},s,r)),u=F(r),h=F(s),c=o(x),a=M(c==null?void 0:c.className,n==null?void 0:n.className,f,s==null?void 0:s.className,r==null?void 0:r.className),w=i({},c==null?void 0:c.style,n==null?void 0:n.style,s==null?void 0:s.style,r==null?void 0:r.style),C=i({},c,n,h,u);return a.length>0&&(C.className=a),Object.keys(w).length>0&&(C.style=w),{props:C,internalRef:c.ref}}const q=["elementType","externalSlotProps","ownerState","skipResolvingSlotProps"];function G(e){var o;const{elementType:n,externalSlotProps:r,ownerState:s,skipResolvingSlotProps:f=!1}=e,x=O(e,q),u=f?{}:T(r,s),{props:h,internalRef:c}=Z(i({},x,{externalSlotProps:u})),a=j(c,u==null?void 0:u.ref,(o=e.additionalProps)==null?void 0:o.ref);return W(n,i({},h,{ref:a}),s)}export{W as a,I as e,G as u};
