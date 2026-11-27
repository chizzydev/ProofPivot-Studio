import{auxiliaryRoute}from'./auxiliary-router.mjs';
import{simulationIdentity}from'./core/simulation-identity.mjs';
import{serveTechnicalReader}from'./technical-reader.mjs';
import developmentCompletion from './development-completion.json' with {type:'json'};
import {randomUUID,createHmac,timingSafeEqual}from'node:crypto';
import assets from './assets.json' with {type:'json'};
import facts from './facts.json' with {type:'json'};
import {hash,experience}from'./core/payload.mjs';
import {PROTOCOL,protocolHash,score}from'./core/protocol.mjs';
import {AsyncLedger}from'./core/async-ledger.mjs';
import {Provider,drain}from'./core/provider.mjs';
import {readout,canonicalRead}from'./core/readout.mjs';
import {serveSandbox}from'./core/sandbox-route.mjs';
import frozen from '../study-freeze.json' with {type:'json'};
import {productionAuthorized,enrollmentOpen,frozenRuntimeManifest,closedReader}from'./core/study-gate.mjs';
import {InternalPilot,INTERNAL_PILOT,studyDesignHash,canShowStudyPerformance}from'./core/internal-pilot.mjs';

const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'"};
const json=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{...headers,'Content-Type':'application/json',...extra}});
const paths={'/':'index.html','/judge':'judge.html','/style.css':'style.css','/app.js':'app.js','/judge.js':'judge.js','/engine.js':'engine.js'};
const running=new Map();
async function pump(ledger,provider){
 const key=ledger.environment+':'+ledger.run;if(running.has(key))return running.get(key);
 const p=drain(ledger,provider,{max:12}).finally(()=>running.delete(key));running.set(key,p);return p;
}
function authorized(request,secret){const input=request.headers.get('Authorization')||'';const expected='Bearer '+secret;if(!secret||input.length!==expected.length)return false;return timingSafeEqual(Buffer.from(input),Buffer.from(expected));}
export async function handleRequest(request,env,ctx,{clock=()=>Date.now(),providerFactory=key=>new Provider(key)}={}){
 try{
  const auxiliary=await auxiliaryRoute(request,env,ctx,{clock,providerFactory},handleRequest,assets);if(auxiliary)return auxiliary;
  const url=new URL(request.url),path=url.pathname;
  const sandbox=serveSandbox(request,assets);if(sandbox)return sandbox;
  if(path==='/health')return json({ok:true,configured:!!env.PP_RUN,environment:env.PP_ENVIRONMENT||'UNCONFIGURED'});
  if(path==='/practice'&&request.method==='GET')return new Response(assets['practice.html'],{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"}});
  const file=paths[path];if(file&&request.method==='GET'){
   // Site navigation outside the frozen study reader; canonical study files stay byte-identical.
   const content=path==='/judge'?assets[file].replace('</main>','<section class="sandbox-invite"><h2>Don\'t trust our prepared example.</h2><p>Enter a fresh supported revision and inspect its claim states through the same engine. Sandbox activity is outside the human study.</p><a class="button outline" href="/sandbox">Try your own revision</a></section></main>'):assets[file];
   return new Response(content,{headers:{...headers,'Content-Type':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'}});
  }
  const scopeMatch=path.match(/^(\/read(?:\/(?:left|right))?)(?:\/(api\/.*))?\/?$/);
  if(path==='/api/judge-state'&&request.method==='GET')return json({state:'TECHNICAL_PROOF',environment:'Development',mode:'ab',experiment_id:developmentCompletion.id,provider:{experiment:developmentCompletion},ledger:{classification:'TECHNICAL_PROOF_ONLY_NO_STUDY_EVENTS'},limitations:['Archived real Development completion; current reader refreshes use real Development Flagsmith. No Production identity or event.']});
  if(!env.PP_AUXILIARY_SCOPE&&scopeMatch?.[1]!=='/read'&&scopeMatch){const proof=await serveTechnicalReader(request,{assets,facts,key:env.FLAGSMITH_JUDGE_ENVIRONMENT_KEY,secret:env.PP_SESSION_SECRET,completion:developmentCompletion,providerFactory});if(proof)return proof;}
  const earlyRun=env.PP_RUN?JSON.parse(env.PP_RUN):null;
  const lockedProduction=env.PP_ENVIRONMENT==='Production'&&!productionAuthorized(earlyRun,frozen);
  if(scopeMatch&&!scopeMatch[2]&&request.method==='GET'){
   const evidence=env.PP_AUXILIARY_SCOPE&&env.DB?await env.DB.prepare('SELECT payload FROM operator_evidence WHERE run=? ORDER BY id DESC LIMIT 1').bind(earlyRun.run).first():null;
   const snapshot=evidence?JSON.parse(evidence.payload):null;const auxiliaryCompleted=!!env.PP_AUXILIARY_SCOPE&&snapshot?.experiment?.status==='completed'&&snapshot.experiment.id===earlyRun.experiment_id;
   let scriptedIndex=null;if(env.PP_ENVIRONMENT==='Simulation'){const rawIndex=url.searchParams.get('session');scriptedIndex=rawIndex!==null&&/^\d+$/.test(rawIndex)?Number(rawIndex):null;if(scriptedIndex===null||scriptedIndex>=earlyRun.expected_sessions)return json({error:'Scripted competition sessions only. Use /qa/read for manual product QA.'},409);if(!auxiliaryCompleted&&!authorized(request,env.PP_OPERATOR_SECRET))return json({error:'Scripted traffic is in progress. Use /qa/read for manual QA.'},403);}
   if(lockedProduction||!auxiliaryCompleted&&!enrollmentOpen(earlyRun,env.PP_ENVIRONMENT,env.PP_ENROLLMENT,frozen)||env.PP_ENVIRONMENT==='Production'&&await new InternalPilot(env.DB,earlyRun.run).phase()==='INVALIDATED'){
    const gated=closedReader(assets['reader.html']);
    return new Response(gated,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
   }
   // Cookie is scoped to this independent reader, with no script access.
   if(!env.PP_SESSION_SECRET)return json({error:'Experiment is being prepared. Please return later.'},503);
   const sign=id=>createHmac('sha256',env.PP_SESSION_SECRET).update(earlyRun.run+':'+id).digest('hex');
   const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pp_session='))?.slice(11);
   let valid=false;if(cookie){const[id,sig]=cookie.split('.');valid=/^pp:[0-9a-f-]{36}$/.test(id)&&/^[0-9a-f]{64}$/.test(sig||'')&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(sign(id),'hex'));}
   const id=scriptedIndex===null?'pp:'+randomUUID():simulationIdentity(earlyRun,env.PP_SESSION_SECRET,scriptedIndex);
   if(scriptedIndex!==null){if(auxiliaryCompleted&&!await env.DB.prepare('SELECT assigned_at FROM participants WHERE run=? AND identity=?').bind(earlyRun.run,id).first())return json({error:'Recorded simulation session unavailable.'},404);if(cookie?.split('.')[0]!==id)valid=false;}return new Response(assets['reader.html'],{headers:{...headers,'Content-Type':'text/html; charset=utf-8',...(!valid?{'Set-Cookie':`pp_session=${id}.${sign(id)}; Path=${scopeMatch[1]}; HttpOnly; SameSite=Strict; Secure; Max-Age=604800`}:{})}});
  }
  if(!env.DB||!env.PP_RUN||!env.FLAGSMITH_ENVIRONMENT_KEY||!env.PP_SESSION_SECRET)return json({error:'Experiment is being prepared. No participant is enrolled.'},503);
  const run=JSON.parse(env.PP_RUN),environment=env.PP_ENVIRONMENT;
  if(!['Development','Production','Simulation'].includes(environment)||run.environment!==environment||run.payload_hash!==hash(facts)||run.protocol_hash!==protocolHash)throw Error('Frozen contract mismatch');
  if(path==='/api/facts'&&request.method==='GET')return json({facts,correction_payload_hash:hash(facts)});
  if(path==='/api/preflight'&&request.method==='GET'&&environment==='Production'){
    const provider=providerFactory(env.FLAGSMITH_ENVIRONMENT_KEY);
    const phase=await new InternalPilot(env.DB,run.run,{warehouseBaseline:run.warehouse_baseline}).phase();
    const admissionOpen=env.PP_ENROLLMENT==='open'&&phase==='INTERNAL_PILOT_COLLECTING';
    const manifest=await frozenRuntimeManifest({run,environment,enrollment:admissionOpen?'open':'closed',facts,protocolHash,assets,frozen,hash,provider});
    // Read only. No initialize(), study identity evaluation, outbox sender or run insert.
    const counts={};for(const table of ['participants','answers','outbox','consents','internal_pilot_slots','internal_pilot_reviews'])counts[table]=(await env.DB.prepare(`SELECT COUNT(*) n FROM ${table} WHERE run=?`).bind(run.run).first()).n;
    return json({...manifest,ledger_counts:counts});
  }
  if(lockedProduction){
   if(path==='/api/state'&&request.method==='GET'){
    const ledger=new AsyncLedger(env.DB,{run:run.run,environment,payload:facts,clock});
    return json({state:'PREFLIGHT_CLOSED',environment,mode:run.mode,study_role:run.role,study_design:INTERNAL_PILOT,study_design_hash:studyDesignHash,run:run.run,experiment_id:run.experiment_id,enrollment:'CLOSED',human_editor_approved:false,ledger:{operational:await new InternalPilot(env.DB,run.run,{warehouseBaseline:run.warehouse_baseline}).operational()},provider:null,limitations:['Preflight only. Human enrollment is closed. The experiment has not been started.']});
   }
   if(scopeMatch?.[2]&&request.method==='POST')return json({error:'Production enrollment is CLOSED. Explicit editor approval and enrollment opening are required.'},409);
   return json({error:'Production study is gated; preflight only.'},403);
  }
  const ledger=new AsyncLedger(env.DB,{run:run.run,environment,payload:facts,clock});await ledger.initialize();const provider=providerFactory(env.FLAGSMITH_ENVIRONMENT_KEY);
  const pilot=environment==='Production'?new InternalPilot(env.DB,run.run,{warehouseBaseline:run.warehouse_baseline}):null;
  const broaderApproved=canShowStudyPerformance(run,pilot?await pilot.phase():null,frozen);
  const readEvidence=async()=>{const r=await env.DB.prepare('SELECT payload,received_at,sha256 FROM operator_evidence WHERE run=? ORDER BY id DESC LIMIT 1').bind(run.run).first();return r?{...JSON.parse(r.payload),receipt_received_at:new Date(r.received_at).toISOString(),receipt_sha256:r.sha256}:null;};
  if(path==='/api/state'&&request.method==='GET'){
   if(pilot&&(await pilot.phase()!=='INTERNAL_PILOT_PASS'||!broaderApproved)){
    ctx.waitUntil(pump(ledger,provider));const operational=await pilot.operational();
    return json({state:operational.phase==='INVALIDATED'?'DO_NOT_ACT':operational.phase,environment,mode:run.mode,study_role:run.role,internal_pilot_phase:operational.phase,broader_recruitment_authorized:false,enrollment:operational.phase==='INTERNAL_PILOT_COLLECTING'&&env.PP_ENROLLMENT==='open'?'OPEN':'CLOSED',run:run.run,experiment_id:run.experiment_id,ledger:{run:run.run,environment,operational},provider:null,inference_valid:operational.phase!=='INVALIDATED',limitations:['Operational/protocol review only. No arm-level performance is shown, including after checkpoint PASS until broader approval. Initial participants and all provider events remain in the actual study. Material changes invalidate the entire run.']});
   }
   ctx.waitUntil(pump(ledger,provider));const summary=await ledger.summary(),snapshot=await readEvidence(),evidence=readout(snapshot,summary);return json({state:evidence.status,evidence,environment,mode:run.mode,study_role:run.role||'development',internal_pilot_phase:pilot?'INTERNAL_PILOT_PASS':null,run:run.run,feature:'proofpivot_correction_experience',experiment_id:run.experiment_id,ledger:summary,provider:snapshot,limitations:['Only genuine human Production study data can support a comprehension claim.','Provider snapshots retain their actual as-of timestamp.','HTTP acceptance is distinct from warehouse visibility.']});
  }
  if(path.startsWith('/operator/')&&request.method==='POST'){
   if(!authorized(request,env.PP_OPERATOR_SECRET))return json({error:'Operator authentication required'},403);
   if(path==='/operator/close-enrollment'){
    await env.DB.prepare('INSERT OR IGNORE INTO run_controls(run,enrollment_closed_at) VALUES(?,?)').bind(run.run,clock()).run();
    const windows=await env.DB.prepare('SELECT COUNT(*) n FROM participants p WHERE p.run=? AND p.exposed_at>? AND NOT EXISTS(SELECT 1 FROM answers a WHERE a.run=p.run AND a.identity=p.identity)').bind(run.run,clock()-PROTOCOL.response_window_ms).first();
    return json({closed:true,open_response_windows:windows.n,ledger:pilot?await pilot.operational():await ledger.summary()});
   }
   if(path==='/operator/internal-pilot-review'&&pilot){
    // Close first, for either assessment outcome. PASS is not broader-recruitment approval.
    await env.DB.prepare('INSERT OR IGNORE INTO run_controls(run,enrollment_closed_at) VALUES(?,?)').bind(run.run,clock()).run();
    const input=await request.json(),review=await pilot.review(input);return json({...review,enrollment_closed:true,broader_recruitment_requires_editor_approval:true});
   }
   if(path==='/operator/cohort-audit'&&pilot){
    const operational=await pilot.operational(),now=clock();
    const answers=(await env.DB.prepare('SELECT a.option,a.correct,a.submitted_at,p.exposed_at FROM answers a JOIN participants p USING(run,identity) WHERE a.run=?').bind(run.run).all()).results;
    const scoring_mismatches=answers.filter(a=>score(a.option,facts)!==!!a.correct).length;
    const invalid_answer_windows=answers.filter(a=>!a.exposed_at||a.submitted_at<a.exposed_at||a.submitted_at-a.exposed_at>PROTOCOL.response_window_ms).length;
    const eligibility=(await env.DB.prepare('SELECT COUNT(*) n FROM participants p LEFT JOIN consents c USING(run,identity) WHERE p.run=? AND (c.identity IS NULL OR c.adult_english!=1 OR c.first_time!=1 OR c.protocol_hash!=?)').bind(run.run,protocolHash).first()).n;
    const assignments=(await env.DB.prepare("SELECT COUNT(*) n FROM participants WHERE run=? AND (quarantined!=0 OR experiment_id!=? OR (variant='control' AND value!='correction_note') OR (variant='evidence_time_machine' AND value!='evidence_time_machine') OR variant NOT IN ('control','evidence_time_machine'))").bind(run.run,run.experiment_id).first()).n;
    const exposure_timing=(await env.DB.prepare('SELECT COUNT(*) n FROM participants WHERE run=? AND exposed_at IS NOT NULL AND (rendered_at IS NULL OR exposed_at-rendered_at<?)').bind(run.run,PROTOCOL.exposure_dwell_ms).first()).n;
    const duplicate_events=(await env.DB.prepare('SELECT COUNT(*) n FROM (SELECT identity,event FROM outbox WHERE run=? GROUP BY identity,event HAVING COUNT(*)>1)').bind(run.run).first()).n;
    const windows=(await env.DB.prepare('SELECT COUNT(*) n FROM participants p WHERE p.run=? AND exposed_at>? AND NOT EXISTS(SELECT 1 FROM answers a WHERE a.run=p.run AND a.identity=p.identity)').bind(run.run,now-PROTOCOL.response_window_ms).first()).n;
    const recent_unexposed=(await env.DB.prepare('SELECT COUNT(*) n FROM participants WHERE run=? AND exposed_at IS NULL AND assigned_at>?').bind(run.run,now-PROTOCOL.response_window_ms).first()).n;
    const closed=!!await env.DB.prepare('SELECT run FROM run_controls WHERE run=?').bind(run.run).first();
    return json({at:new Date(now).toISOString(),run:run.run,experiment_id:run.experiment_id,payload_hash:hash(facts),protocol_hash:protocolHash,candidate_hash:frozen.candidate_hash,study_design_hash:studyDesignHash,enrollment:env.PP_ENROLLMENT==='open'&&!closed&&operational.phase==='INTERNAL_PILOT_COLLECTING'?'OPEN':'CLOSED',operational,integrity:{scoring_mismatches,invalid_answer_windows,eligibility,assignments,exposure_timing,duplicate_events},open_response_windows:windows,recent_unexposed,performance_withheld:true,broader_recruitment_authorized:false});
   }
   if(path==='/operator/drain'){await pump(ledger,provider);return json(pilot&&(await pilot.phase()!=='INTERNAL_PILOT_PASS'||!broaderApproved)?await pilot.operational():await ledger.summary());}
   if(path==='/operator/evidence'){
    const input=await request.json();
    if(pilot&&(await pilot.phase()!=='INTERNAL_PILOT_PASS'||!broaderApproved)&&input.results?.results)return json({error:'Arm-level results are withheld until broader-study approval'},409);
    if(input.run?.run!==run.run||input.run?.experiment_id!==run.experiment_id||input.experiment?.feature?.id!==run.feature_id||input.environment_id!==run.environment_id)return json({error:'Provider snapshot contract mismatch'},409);
    await env.DB.prepare('INSERT INTO operator_evidence(run,received_at,payload,sha256) VALUES(?,?,?,?)').bind(run.run,clock(),JSON.stringify(input),hash(input)).run();return json({stored:true,sha256:hash(input)});
   }
  }
  if(scopeMatch?.[2]&&request.method==='POST'){
   if(request.headers.get('Origin')!==url.origin)return json({error:'Same-origin request required'},403);
   const length=Number(request.headers.get('Content-Length')||0);if(length>4096)return json({error:'Request too large'},413);
   const text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);const input=JSON.parse(text||'{}');
   const raw=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pp_session='))?.slice(11)||'';
   const[id,sig]=raw.split('.');const expected=createHmac('sha256',env.PP_SESSION_SECRET).update(run.run+':'+(id||'')).digest('hex');
   if(!/^pp:[0-9a-f-]{36}$/.test(id||'')||!/^[0-9a-f]{64}$/.test(sig||'')||!timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex')))return json({error:'Open the reader page to start a session'},403);
   const limit=await env.DB.prepare('INSERT INTO request_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(`${run.run}:${id}:${Math.floor(clock()/60000)}`).first();
   if(limit.count>40)return json({error:'Please wait a moment before retrying'},429);
   const action=scopeMatch[2];
   if(environment==='Simulation'&&!authorized(request,env.PP_OPERATOR_SECRET)){const e=await readEvidence();if(e?.experiment?.status!=='completed')return json({error:'Only the frozen scripted traffic runner may enter this simulation. Manual QA is /qa/read.'},403);}
   if(environment==='Simulation'&&['api/exposure','api/answer'].includes(action)&&(env.PP_ENROLLMENT!=='open'||await env.DB.prepare('SELECT run FROM run_controls WHERE run=?').bind(run.run).first()))return json({error:'Simulation traffic is sealed. Replays cannot add or change experiment events.'},409);
   if(action==='api/session')return json(await ledger.session(id));
   if(pilot&&await pilot.phase()==='INVALIDATED')return json({error:'Entire run invalidated. Enrollment is closed; all records are preserved.'},409);
   if(action==='api/consent'){
    if(input.consent!==true)return json({error:'Voluntary consent required'},400);
    if(pilot&&await pilot.phase()==='INTERNAL_PILOT_PASS'&&!broaderApproved&&!(await ledger.participant(id))?.assigned_at)return json({error:'Cohort review complete. Broader recruitment requires editor approval.'},409);
    const snapshot=await readEvidence();
    if(snapshot?.experiment?.status!=='completed'){
     if(!enrollmentOpen(run,environment,env.PP_ENROLLMENT,frozen))return json({error:'Enrollment is closed. Existing answers are preserved.'},409);
     const alreadyClosed=await env.DB.prepare('SELECT enrollment_closed_at FROM run_controls WHERE run=?').bind(run.run).first();
     if(alreadyClosed)return json({error:'Enrollment is closed. Existing answers are preserved.'},409);
    }
    if(environment==='Production'&&snapshot?.experiment?.status!=='completed'&&(input.adultEnglish!==true||input.firstTime!==true))return json({error:'This study requires adult English-reading participants who have not seen this exact task before.'},400);
    if(pilot&&snapshot?.experiment?.status!=='completed')await pilot.reserve(id);
    const prior=await ledger.participant(id);
    const flag=prior?.variant&&snapshot?.experiment?.status!=='completed'?{enabled:true,value:prior.value,variant:prior.variant,experiment:{id:prior.experiment_id,inExperiment:true}}:await provider.evaluate(id);
    if(pilot&&await pilot.phase()==='INVALIDATED')return json({error:'Entire run invalidated. Enrollment is closed.'},409);
    if(canonicalRead(snapshot,run,flag))return json({...experience(facts,flag.value,'ab'),assigned_by:'Flagsmith',provider_variant:flag.variant,experiment_id:run.experiment_id,mode:'canonical',environment,study_complete:true,...(prior?.variant?{historical_assignment:{renderer:run.mode==='aa'?'correction_note':prior.value,variant:prior.variant,assigned_at:prior.assigned_at,experiment_id:prior.experiment_id}}:{})});
    if(environment==='Production'&&(input.adultEnglish!==true||input.firstTime!==true))return json({error:'This study requires adult English-reading participants who have not seen this exact task before.'},400);
    const control=await env.DB.prepare('SELECT enrollment_closed_at FROM run_controls WHERE run=?').bind(run.run).first();
    if(env.PP_ENROLLMENT!=='open'||control)return json({error:'Enrollment is closed. Existing answers are preserved.'},409);
    if(flag.experiment?.id!==run.experiment_id)throw Error('Provider experiment drift');
    await env.DB.prepare('INSERT OR IGNORE INTO consents(run,identity,protocol_hash,adult_english,first_time,at) VALUES(?,?,?,?,?,?)').bind(run.run,id,protocolHash,+!!input.adultEnglish,+!!input.firstTime,clock()).run();
    await ledger.consent(id);const p=await ledger.assign(id,flag);await ledger.render(id);
    return json({...experience(facts,p.value,run.mode),assigned_by:'Flagsmith',provider_variant:p.variant,experiment_id:p.experiment_id,mode:run.mode,environment,session:await ledger.session(id),protocol:{question:PROTOCOL.question,order:PROTOCOL.order,options:PROTOCOL.options.map(o=>o.label),exposure_dwell_ms:PROTOCOL.exposure_dwell_ms,response_window_ms:PROTOCOL.response_window_ms}});
   }
   if(action==='api/exposure'){
    const control=await env.DB.prepare('SELECT enrollment_closed_at FROM run_controls WHERE run=?').bind(run.run).first();
    if(control&&!(await ledger.participant(id))?.exposed_at)return json({error:'Enrollment is closed'},409);
    const result=await ledger.expose(id,input);ctx.waitUntil(pump(ledger,provider));return json(result);
   }
   if(action==='api/answer'){const result=await ledger.answer(id,input.option,input.payloadHash);if(pilot)await pilot.closeIfCheckpointComplete();ctx.waitUntil(pump(ledger,provider));return json(result);}
   if(action==='api/reevaluate'){
    if(scopeMatch[1]==='/read')return json({error:'This control is available in the technical proof readers only.'},403);
    if(!(await ledger.participant(id))?.variant)throw Error('Prior assignment required');
    const flag=await provider.evaluate(id);if(!flag.enabled||!['correction_note','evidence_time_machine'].includes(flag.value))throw Error('Provider unavailable');return json({...experience(facts,flag.value,run.mode),assigned_by:'Flagsmith',provider_variant:flag.variant,experiment:flag.experiment??null});
   }
  }
  return json({error:'Not found'},404);
 }catch(e){if(['SESSION_EXPIRED','READ_REQUIRED'].includes(e.code))return json({error:e.message,code:e.code,session:e.session},409);const messages={'Meaningful display required':'Please keep the correction in view for a moment before answering. Your answer has not been recorded.','Complete answer required':'Choose one answer before submitting.','Truth lock mismatch':'This reading task is unavailable. Your answer was not recorded. Please return later.'};return json({error:messages[e.message]||'We could not complete this request. Existing responses are preserved. Please try again later.'},messages[e.message]?409:503);}
}
