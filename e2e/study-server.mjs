// CI-only host. The Production request handler, SQL transitions, cookies and UI
// are real; only provider transport/assignment and clock are injected. No secrets.
import http from'node:http';import{DatabaseSync}from'node:sqlite';import{readFileSync,readdirSync}from'node:fs';
import{handleRequest}from'../proofpivot/worker-handler.mjs';import frozen from'../study-freeze.json' with{type:'json'};
const origin='http://127.0.0.1:4322';let db,now,events,evaluations,env;
function reset(){db?.close();db=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));now=1800000000000;events=[];evaluations=[];
 const run={...frozen,environment:'Production',environment_id:116183,project_id:53981,feature_id:304953,variant_id:36968,mode:'ab',role:'internal_pilot',preflight_only:false,production_gate_verified:true,protocol_status:'FROZEN',human_editor_approved_at:'2026-11-27T00:00:00Z',human_editor_approval_candidate_hash:frozen.candidate_hash,broader_recruitment_authorized:false};
 const adapter={prepare(sql){return{sql,args:[],bind(...args){return{...this,args};},async run(){return db.prepare(this.sql).run(...this.args);},async first(){return db.prepare(this.sql).get(...this.args)||null;},async all(){return{results:db.prepare(this.sql).all(...this.args)};}};},async batch(statements){db.exec('BEGIN');try{const out=statements.map(s=>db.prepare(s.sql).run(...s.args));db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
 env={DB:adapter,PP_RUN:JSON.stringify(run),PP_ENVIRONMENT:'Production',PP_ENROLLMENT:'open',PP_SESSION_SECRET:'CI-only-no-live-key',PP_OPERATOR_SECRET:'CI-only-operator',FLAGSMITH_ENVIRONMENT_KEY:'CI-only-no-provider-key',FLAGSMITH_JUDGE_ENVIRONMENT_KEY:'CI-only-development-key'};
}
reset();
const providerFactory=key=>({async evaluate(id){evaluations.push({id,key});return{enabled:true,value:'correction_note',variant:'control',experiment:{id:frozen.experiment_id,inExperiment:true}};},async evaluateEnvironment(){return{enabled:false,value:'correction_note',variant:null,experiment:null};},async send(row){events.push({event:row.event,identity:row.identity,experiment_id:row.experiment_id});return{status:'HTTP_ACCEPTED',outcomes:[{accepted:1,rejected:[]}]};}});
http.createServer(async(req,res)=>{try{
 let body='';for await(const b of req)body+=b;
 let response;
 if(req.url==='/__test/reset'){reset();response=Response.json({now});}
 else if(req.url==='/__test/advance'){now+=JSON.parse(body).ms;response=Response.json({now});}
 else if(req.url==='/__test/state')response=Response.json({now,events,evaluations,participants:db.prepare('SELECT identity,assigned_at,exposed_at FROM participants').all(),answers:db.prepare('SELECT identity,option,submitted_at FROM answers').all(),outbox:db.prepare('SELECT event FROM outbox').all()});
 else{const pending=[];const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(body?{body}:{} )});response=await handleRequest(request,env,{waitUntil:p=>pending.push(p)},{clock:()=>now,providerFactory});await Promise.allSettled(pending);}
 const headers=Object.fromEntries(response.headers);if(response.headers.getSetCookie().length)headers['set-cookie']=response.headers.getSetCookie();res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('CI harness failed');}
}).listen(4322,'127.0.0.1',()=>console.log('Isolated normal study path: '+origin));
