import {randomUUID,createHmac,timingSafeEqual}from'node:crypto';
import assets from './assets.json';
import facts from './facts.json';
import {hash,experience}from'./core/payload.mjs';
import {PROTOCOL,protocolHash}from'./core/protocol.mjs';
import {AsyncLedger}from'./core/async-ledger.mjs';
import {Provider,drain}from'./core/provider.mjs';
import {readout,canonicalRead}from'./core/readout.mjs';
import {serveSandbox}from'./core/sandbox-route.mjs';
import frozen from '../study-freeze.json';
import {productionAuthorized,enrollmentOpen,frozenRuntimeManifest}from'./core/study-gate.mjs';

const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'"};
const json=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{...headers,'Content-Type':'application/json',...extra}});
const paths={'/':'index.html','/judge':'judge.html','/style.css':'style.css','/app.js':'app.js','/judge.js':'judge.js','/engine.js':'engine.js'};
const running=new Map();
async function pump(ledger,provider){
 const key=ledger.environment+':'+ledger.run;if(running.has(key))return running.get(key);
 const p=drain(ledger,provider,{max:12}).finally(()=>running.delete(key));running.set(key,p);return p;
}
function authorized(request,secret){const input=request.headers.get('Authorization')||'';const expected='Bearer '+secret;if(!secret||input.length!==expected.length)return false;return timingSafeEqual(Buffer.from(input),Buffer.from(expected));}
export async function handleRequest(request,env,ctx){
 try{
  const url=new URL(request.url),path=url.pathname;
  const sandbox=serveSandbox(request,assets);if(sandbox)return sandbox;
  if(path==='/health')return json({ok:true,configured:!!env.PP_RUN,environment:env.PP_ENVIRONMENT||'UNCONFIGURED'});
  const file=paths[path];if(file&&request.method==='GET'){
   // Site navigation outside the frozen study reader; canonical study files stay byte-identical.
   const content=path==='/judge'?assets[file].replace('</main>','<section class="sandbox-invite"><h2>Don\'t trust our prepared example.</h2><p>Enter a fresh supported revision and inspect its claim states through the same engine. Sandbox activity is outside the human study.</p><a class="button outline" href="/sandbox">Try your own revision</a></section></main>'):assets[file];
   return new Response(content,{headers:{...headers,'Content-Type':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'}});
  }
  const scopeMatch=path.match(/^(\/read(?:\/(?:left|right))?)(?:\/(api\/.*))?\/?$/);
  const earlyRun=env.PP_RUN?JSON.parse(env.PP_RUN):null;
  const lockedProduction=env.PP_ENVIRONMENT==='Production'&&!productionAuthorized(earlyRun,frozen);
  if(scopeMatch&&!scopeMatch[2]&&request.method==='GET'){
   if(lockedProduction||!enrollmentOpen(earlyRun,env.PP_ENVIRONMENT,env.PP_ENROLLMENT,frozen)){
    const gated=assets['reader.html'].replace('<body>','<body><aside class="data-notice" role="status"><strong>Enrollment is CLOSED.</strong><p>This is a preflight or closed reading surface. Explicit editor approval and enrollment opening are required before study participation. No participant identity has been created.</p><a href="/sandbox">Try your own revision outside the study</a></aside>').replace('id="begin"','id="begin" disabled aria-disabled="true"');
    return new Response(gated,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
   }
   // Cookie is scoped to this independent reader, with no script access.
   if(!env.PP_SESSION_SECRET)return json({error:'Experiment is being prepared. Please return later.'},503);
   const sign=id=>createHmac('sha256',env.PP_SESSION_SECRET).update(id).digest('hex');
   const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pp_session='))?.slice(11);
   let valid=false;if(cookie){const[id,sig]=cookie.split('.');valid=/^pp:[0-9a-f-]{36}$/.test(id)&&/^[0-9a-f]{64}$/.test(sig||'')&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(sign(id),'hex'));}
   const id='pp:'+randomUUID();return new Response(assets['reader.html'],{headers:{...headers,'Content-Type':'text/html; charset=utf-8',...(!valid?{'Set-Cookie':`pp_session=${id}.${sign(id)}; Path=${scopeMatch[1]}; HttpOnly; SameSite=Strict; Secure; Max-Age=604800`}:{})}});
  }
  if(!env.DB||!env.PP_RUN||!env.FLAGSMITH_ENVIRONMENT_KEY||!env.PP_SESSION_SECRET)return json({error:'Experiment is being prepared. No participant is enrolled.'},503);
  const run=JSON.parse(env.PP_RUN),environment=env.PP_ENVIRONMENT;
  if(!['Development','Production'].includes(environment)||run.environment!==environment||run.payload_hash!==hash(facts)||run.protocol_hash!==protocolHash)throw Error('Frozen contract mismatch');
  if(path==='/api/facts'&&request.method==='GET')return json({facts,correction_payload_hash:hash(facts)});
  if(lockedProduction){
   if(path==='/api/preflight'&&request.method==='GET'){
    const provider=new Provider(env.FLAGSMITH_ENVIRONMENT_KEY);
    const manifest=await frozenRuntimeManifest({run,environment,enrollment:env.PP_ENROLLMENT,facts,protocolHash,assets,frozen,hash,provider});
    // Read only. No initialize(), study identity evaluation, outbox sender or run insert.
    const counts={};for(const table of ['participants','answers','outbox','consents'])counts[table]=(await env.DB.prepare(`SELECT COUNT(*) n FROM ${table} WHERE run=?`).bind(run.run).first()).n;
    return json({...manifest,ledger_counts:counts});
   }
   if(path==='/api/state'&&request.method==='GET'){
    const ledger=new AsyncLedger(env.DB,{run:run.run,environment,payload:facts});
    return json({state:'PREFLIGHT_CLOSED',environment,mode:run.mode,study_role:run.role,run:run.run,experiment_id:run.experiment_id,enrollment:'CLOSED',human_editor_approved:false,ledger:await ledger.summary(),provider:null,limitations:['Preflight only. Human enrollment is closed. The experiment has not been started.']});
   }
   if(scopeMatch?.[2]&&request.method==='POST')return json({error:'Production enrollment is CLOSED. Explicit editor approval and enrollment opening are required.'},409);
   return json({error:'Production study is gated; preflight only.'},403);
  }
  const ledger=new AsyncLedger(env.DB,{run:run.run,environment,payload:facts});await ledger.initialize();const provider=new Provider(env.FLAGSMITH_ENVIRONMENT_KEY);
  const readEvidence=async()=>{const r=await env.DB.prepare('SELECT payload,received_at,sha256 FROM operator_evidence WHERE run=? ORDER BY id DESC LIMIT 1').bind(run.run).first();return r?{...JSON.parse(r.payload),receipt_received_at:new Date(r.received_at).toISOString(),receipt_sha256:r.sha256}:null;};
  if(path==='/api/state'&&request.method==='GET'){
   ctx.waitUntil(pump(ledger,provider));const summary=await ledger.summary(),snapshot=await readEvidence(),evidence=readout(snapshot,summary);return json({state:evidence.status,evidence,environment,mode:run.mode,study_role:run.role||'development',run:run.run,feature:'proofpivot_correction_experience',experiment_id:run.experiment_id,ledger:summary,provider:snapshot,limitations:['Only genuine human Production study data can support a comprehension claim.','Provider snapshots retain their actual as-of timestamp.','HTTP acceptance is distinct from warehouse visibility.']});
  }
  if(path.startsWith('/operator/')&&request.method==='POST'){
   if(!authorized(request,env.PP_OPERATOR_SECRET))return json({error:'Operator authentication required'},403);
   if(path==='/operator/close-enrollment'){
    await env.DB.prepare('INSERT OR IGNORE INTO run_controls(run,enrollment_closed_at) VALUES(?,?)').bind(run.run,Date.now()).run();
    const windows=await env.DB.prepare('SELECT COUNT(*) n FROM participants p WHERE p.run=? AND p.exposed_at>? AND NOT EXISTS(SELECT 1 FROM answers a WHERE a.run=p.run AND a.identity=p.identity)').bind(run.run,Date.now()-PROTOCOL.response_window_ms).first();
    return json({closed:true,open_response_windows:windows.n,ledger:await ledger.summary()});
   }
   if(path==='/operator/drain'){await pump(ledger,provider);return json(await ledger.summary());}
   if(path==='/operator/evidence'){
    const input=await request.json();
    if(input.run?.run!==run.run||input.run?.experiment_id!==run.experiment_id||input.experiment?.feature?.id!==run.feature_id||input.environment_id!==(environment==='Development'?116182:116183))return json({error:'Provider snapshot contract mismatch'},409);
    await env.DB.prepare('INSERT INTO operator_evidence(run,received_at,payload,sha256) VALUES(?,?,?,?)').bind(run.run,Date.now(),JSON.stringify(input),hash(input)).run();return json({stored:true,sha256:hash(input)});
   }
  }
  if(scopeMatch?.[2]&&request.method==='POST'){
   if(request.headers.get('Origin')!==url.origin)return json({error:'Same-origin request required'},403);
   const length=Number(request.headers.get('Content-Length')||0);if(length>4096)return json({error:'Request too large'},413);
   const text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);const input=JSON.parse(text||'{}');
   const raw=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pp_session='))?.slice(11)||'';
   const[id,sig]=raw.split('.');const expected=createHmac('sha256',env.PP_SESSION_SECRET).update(id||'').digest('hex');
   if(!/^pp:[0-9a-f-]{36}$/.test(id||'')||!/^[0-9a-f]{64}$/.test(sig||'')||!timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex')))return json({error:'Open the reader page to start a session'},403);
   const limit=await env.DB.prepare('INSERT INTO request_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(`${run.run}:${id}:${Math.floor(Date.now()/60000)}`).first();
   if(limit.count>40)return json({error:'Please wait a moment before retrying'},429);
   const action=scopeMatch[2];
   if(action==='api/consent'){
    if(input.consent!==true)return json({error:'Voluntary consent required'},400);
    const snapshot=await readEvidence();
    if(snapshot?.experiment?.status!=='completed'){
     if(!enrollmentOpen(run,environment,env.PP_ENROLLMENT,frozen))return json({error:'Enrollment is closed. Existing answers are preserved.'},409);
     const alreadyClosed=await env.DB.prepare('SELECT enrollment_closed_at FROM run_controls WHERE run=?').bind(run.run).first();
     if(alreadyClosed)return json({error:'Enrollment is closed. Existing answers are preserved.'},409);
    }
    if(environment==='Production'&&snapshot?.experiment?.status!=='completed'&&(input.adultEnglish!==true||input.firstTime!==true))return json({error:'This study requires adult English-reading participants who have not seen this exact task before.'},400);
    const flag=await provider.evaluate(id);
    if(canonicalRead(snapshot,run,flag))return json({...experience(facts,flag.value,'ab'),assigned_by:'Flagsmith',provider_variant:flag.variant,experiment_id:run.experiment_id,mode:'canonical',environment,study_complete:true});
    if(environment==='Production'&&(input.adultEnglish!==true||input.firstTime!==true))return json({error:'This study requires adult English-reading participants who have not seen this exact task before.'},400);
    const control=await env.DB.prepare('SELECT enrollment_closed_at FROM run_controls WHERE run=?').bind(run.run).first();
    if(env.PP_ENROLLMENT!=='open'||control)return json({error:'Enrollment is closed. Existing answers are preserved.'},409);
    if(flag.experiment?.id!==run.experiment_id)throw Error('Provider experiment drift');
    await env.DB.prepare('INSERT OR IGNORE INTO consents(run,identity,protocol_hash,adult_english,first_time,at) VALUES(?,?,?,?,?,?)').bind(run.run,id,protocolHash,+!!input.adultEnglish,+!!input.firstTime,Date.now()).run();
    await ledger.consent(id);const p=await ledger.assign(id,flag);await ledger.render(id);
    return json({...experience(facts,p.value,run.mode),assigned_by:'Flagsmith',provider_variant:p.variant,experiment_id:p.experiment_id,mode:run.mode,environment,protocol:{question:PROTOCOL.question,order:PROTOCOL.order,options:PROTOCOL.options.map(o=>o.label),exposure_dwell_ms:PROTOCOL.exposure_dwell_ms}});
   }
   if(action==='api/exposure'){
    const control=await env.DB.prepare('SELECT enrollment_closed_at FROM run_controls WHERE run=?').bind(run.run).first();
    if(control&&!(await ledger.participant(id))?.exposed_at)return json({error:'Enrollment is closed'},409);
    const result=await ledger.expose(id,input);ctx.waitUntil(pump(ledger,provider));return json(result);
   }
   if(action==='api/answer'){const result=await ledger.answer(id,input.option,input.payloadHash);ctx.waitUntil(pump(ledger,provider));return json(result);}
   if(action==='api/reevaluate'){
    if(!(await ledger.participant(id))?.variant)throw Error('Prior assignment required');
    const flag=await provider.evaluate(id);if(!flag.enabled||!['correction_note','evidence_time_machine'].includes(flag.value))throw Error('Provider unavailable');return json({...experience(facts,flag.value,run.mode),assigned_by:'Flagsmith',provider_variant:flag.variant,experiment:flag.experiment??null});
   }
  }
  return json({error:'Not found'},404);
 }catch(e){const safe=['Meaningful display required','Complete answer required','Truth lock mismatch','Exposure or valid response window required'];return json({error:safe.includes(e.message)?e.message:'Experiment unavailable. Existing responses are preserved.'},safe.includes(e.message)?409:503);}
}
