import{u as g,r as y,j as e,L as r}from"./index-BzBvWqhX.js";import{u}from"./auth-DP1CS8M1.js";import{e as s,U as f,C as N,d as j}from"./zod-_sgmqnks.js";/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],b=s("chart-column",k);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],M=s("log-out",v);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],_=s("map-pin",w);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 18h16",key:"19g7jn"}],["path",{d:"M4 6h16",key:"1o0s65"}]],L=s("menu",C);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],A=s("package",$);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]],o=s("receipt",V);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],d=s("user-plus",z);/**
 * @license lucide-react v0.532.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],E=s("x",R);function I({children:i}){const{user:a,clearAuth:l,isAuthenticated:m}=u(),h=g(),[t,c]=y.useState(!1),x=()=>{l(),h({to:"/"})};if(!m||!a)return e.jsx(e.Fragment,{children:i});const p=[...a.role==="ADMIN"?[{name:"User Management",href:"/admin/users",icon:f},{name:"Order Management",href:"/admin/orders",icon:o},{name:"Venue Management",href:"/admin/venues",icon:_}]:[],{name:"Event Management",href:"/admin/events",icon:N},{name:"Session Management",href:"/admin/sessions",icon:j},{name:"Product Management",href:"/admin/products",icon:A},{name:"Expense Management",href:"/admin/expenses",icon:o},...a.role==="ADMIN"?[{name:"Reporting",href:"/admin/reporting",icon:b}]:[]];return e.jsxs("div",{className:"min-h-screen bg-gray-50",children:[e.jsx("header",{className:"bg-white shadow-sm border-b border-gray-200",children:e.jsx("div",{className:"px-4 sm:px-6 lg:px-8",children:e.jsxs("div",{className:"flex justify-between items-center h-16",children:[e.jsxs("div",{className:"flex items-center",children:[e.jsx("button",{onClick:()=>c(!t),className:"lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100",children:t?e.jsx(E,{className:"h-6 w-6"}):e.jsx(L,{className:"h-6 w-6"})}),e.jsxs(r,{to:"/",className:"flex items-center ml-2 lg:ml-0",children:[e.jsx("img",{src:"/mrittika.png",alt:"Mrittika Canada Logo",className:"h-12 w-auto mr-3"}),e.jsx("h1",{className:"text-2xl font-bold text-red-600",children:"Event Management"})]})]}),e.jsxs("div",{className:"flex items-center space-x-4",children:[e.jsxs(r,{to:"/register",className:"bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center",children:[e.jsx(d,{className:"h-4 w-4 mr-2"}),"Guest Registration"]}),a?.member&&e.jsxs(r,{to:"/member-register",className:"bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center",children:[e.jsx(d,{className:"h-4 w-4 mr-2"}),"Member Registration"]}),e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsxs("div",{className:"text-right",children:[e.jsx("p",{className:"text-sm font-medium text-gray-900",children:a.member?.memberName||a.email}),e.jsx("p",{className:"text-xs text-gray-500",children:a.role})]}),e.jsx("button",{onClick:x,className:"p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md",title:"Logout",children:e.jsx(M,{className:"h-5 w-5"})})]})]})]})})}),e.jsxs("div",{className:"flex",children:[e.jsx("aside",{className:`
          ${t?"translate-x-0":"-translate-x-full"}
          lg:translate-x-0 transition-transform duration-200 ease-in-out
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200
          lg:block
        `,children:e.jsx("nav",{className:"mt-8 px-4",children:e.jsx("ul",{className:"space-y-2",children:p.map(n=>e.jsx("li",{children:e.jsxs(r,{to:n.href,className:"flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-red-600 hover:bg-red-50 transition-colors",onClick:()=>c(!1),children:[e.jsx(n.icon,{className:"mr-3 h-5 w-5"}),n.name]})},n.name))})})}),t&&e.jsx("div",{className:"lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50",onClick:()=>c(!1)}),e.jsx("main",{className:"flex-1 lg:ml-0",children:e.jsx("div",{className:"py-8 px-4 sm:px-6 lg:px-8",children:i})})]})]})}export{b as C,I as L,_ as M,A as P,o as R,E as X};
