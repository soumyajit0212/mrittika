import{defineEventHandler as l,toWebRequest as p}from"@tanstack/react-start/server";const f=l(async o=>{const r=p(o);if(!r||r.method!=="POST")return new Response("Method not allowed",{status:405});try{const t=await r.json();return!t.logs||!Array.isArray(t.logs)?new Response("Invalid request body",{status:400}):(t.logs.forEach(e=>{const i=new Date(e.timestamp).toLocaleTimeString(),c=e.url?` (${e.url})`:"";let s=`${`[browser] [${i}]`} [${e.level}] ${e.message}${c}`;switch(e.stacks&&e.stacks.length>0&&(s+=`
`+e.stacks.map(n=>n.split(`
`).map(a=>`    ${a}`).join(`
`)).join(`
`)),e.extra&&e.extra.length>0&&(s+=`
    Extra data: `+JSON.stringify(e.extra,null,2).split(`
`).map((n,a)=>a===0?n:`    ${n}`).join(`
`)),e.level){case"error":console.error(s);break;case"warn":console.warn(s);break;case"info":console.info(s);break;case"debug":console.log(s);break;default:console.log(s)}}),new Response(JSON.stringify({success:!0}),{status:200,headers:{"Content-Type":"application/json"}}))}catch(t){return console.error("Error processing client logs:",t),new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers:{"Content-Type":"application/json"}})}});export{f as default};
