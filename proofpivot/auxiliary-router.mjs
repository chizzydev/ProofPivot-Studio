import{hash}from'./core/payload.mjs';
import simulationFreeze from'./simulation-freeze.json' with{type:'json'};
// Prefix routing delegates to the SAME consent/assignment/exposure/answer handler.
// Only trusted server configuration can select an auxiliary environment or key.
export async function auxiliaryRoute(request,env,ctx,services,delegate,assets){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/judge'&&request.method==='GET'&&env.PP_SIMULATION_RUN)return new Response(null,{status:307,headers:{Location:'/simulation/judge','Cache-Control':'no-store'}});
 const prefix=path.startsWith('/simulation/')?'/simulation':path.startsWith('/qa/')?'/qa':null;if(!prefix||env.PP_AUXILIARY_SCOPE)return null;
 const simulation=prefix==='/simulation',raw=simulation?env.PP_SIMULATION_RUN:env.PP_QA_RUN,key=simulation?env.FLAGSMITH_SIMULATION_ENVIRONMENT_KEY:env.FLAGSMITH_JUDGE_ENVIRONMENT_KEY;
 if(!raw||!key)return Response.json({error:'This non-study experience is being prepared.'},{status:503});
 const run=JSON.parse(raw);
 if(simulation&&(run.environment!=='Simulation'||run.environment_id!==simulationFreeze.run.environment_id||run.experiment_id!==simulationFreeze.run.experiment_id||run.model_hash!==simulationFreeze.model.model_hash||hash(run)!==hash(simulationFreeze.run)))return Response.json({error:'Frozen simulation contract mismatch'},{status:503});
 if(!simulation&&(run.environment!=='Development'||run.environment_id!==116182||run.role!=='manual_qa'))return Response.json({error:'Development QA contract mismatch'},{status:503});
 if(key===env.FLAGSMITH_ENVIRONMENT_KEY||run.environment_id===116183||run.experiment_id===907)return Response.json({error:'Non-study isolation failure'},{status:503});
 const staticName=path===prefix+'/app.js'?'simulation-app.js':path===prefix+'/judge.js'?'simulation-judge.js':path===prefix+'/judge'?'simulation-judge.html':null;
 if(staticName&&request.method==='GET'){let body=assets[staticName];if(staticName==='simulation-judge.html'&&env.PP_SIMULATION_REPLAY){const replay=JSON.parse(env.PP_SIMULATION_REPLAY);if(replay.run!==run.run||!Number.isInteger(replay.left)||!Number.isInteger(replay.right)||replay.left===replay.right)throw Error('Actual recorded replay sessions required');body=body.replace('session=0',`session=${replay.left}`).replace('session=1',`session=${replay.right}`);}return new Response(body,{headers:{'Content-Type':staticName.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; object-src 'none'"}});}
 const mapped=new URL(request.url);mapped.pathname=path.slice(prefix.length);
 const child={...env,PP_AUXILIARY_SCOPE:prefix,PP_ENVIRONMENT:run.environment,PP_RUN:raw,FLAGSMITH_ENVIRONMENT_KEY:key,PP_SESSION_SECRET:simulation?env.PP_SIMULATION_SESSION_SECRET:env.PP_SESSION_SECRET,PP_ENROLLMENT:simulation?env.PP_SIMULATION_ENROLLMENT||'closed':env.PP_QA_ENROLLMENT||'closed'};
 const response=await delegate(new Request(mapped,request),child,ctx,services),headers=new Headers(response.headers);
 const cookies=headers.getSetCookie();headers.delete('Set-Cookie');for(const c of cookies)headers.append('Set-Cookie',c.replace('Path=/read','Path='+prefix+'/read'));
 if(headers.get('Content-Type')?.startsWith('text/html')){
  const label=simulation?'SIMULATED HACKATHON TRAFFIC — NOT HUMAN EVIDENCE':'MANUAL PRODUCT QA — NOT STUDY EVIDENCE';
  const html=(await response.text()).replace('src="/app.js"',`src="${prefix}/app.js"`).replace('<main class="reader-main">',`<main class="reader-main"><p class="eyebrow" role="note">${label}</p>`).replace('This Development run is for calibration. It does not establish a human comprehension result.',label+'. The ten-minute window uses the normal application backend.');
  return new Response(html,{status:response.status,headers});
 }
 if(headers.get('Content-Type')?.startsWith('application/json')){const body=await response.json();return new Response(JSON.stringify({...body,classification:run.classification,...(mapped.pathname==='/api/state'?{simulation_model:simulation?simulationFreeze.model:null,production_human_study:'907 remains CLOSED and UNSTARTED',manual_qa_path:'/qa/read'}:{})}),{status:response.status,headers});}
 return new Response(response.body,{status:response.status,headers});
}
