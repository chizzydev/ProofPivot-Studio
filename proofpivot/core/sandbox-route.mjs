// Static-only route boundary: intentionally receives no env, DB, secrets or execution context.
const routes={'/sandbox':'sandbox.html','/sandbox/':'sandbox.html','/sandbox.js':'sandbox.js','/sandbox.css':'sandbox.css','/sandbox-schema':'sandbox-schema.html','/sandbox.mjs':'sandbox.mjs','/payload-core.mjs':'payload-core.mjs','/engine.mjs':'engine.mjs'};
export function serveSandbox(request,assets){
 const path=new URL(request.url).pathname,file=routes[path];
 if(!file&&!path.startsWith('/sandbox/'))return null;
 const headers={'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store'};
 if(!file||request.method!=='GET')return new Response('Sandbox has no enrollment or event endpoint.',{status:404,headers});
 return new Response(assets[file],{headers:{...headers,'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}});
}
