import{createHmac,randomUUID,timingSafeEqual}from'node:crypto';
import{experience}from'./core/payload.mjs';import{Provider}from'./core/provider.mjs';
// No Production key, DB, enrollment, scorer, sender or study identity is accepted here.
export async function serveTechnicalReader(request,{assets,facts,key,secret,completion,providerFactory=k=>new Provider(k)}){
 const url=new URL(request.url),scope=url.pathname.match(/^(\/read\/(?:left|right))(?:\/(api\/.*))?\/?$/);if(!scope)return null;
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(b,status=200)=>new Response(JSON.stringify(b),{status,headers});
 if(!key||!secret)return json({error:'Technical proof is temporarily unavailable. Production study enrollment is unaffected.'},503);
 const sign=id=>createHmac('sha256',secret).update('development-technical:'+id).digest('hex');
 const raw=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('pp_proof='))?.slice(9)||'';
 let[id,sig]=raw.split('.');const valid=/^judge:[0-9a-f-]{36}$/.test(id||'')&&/^[0-9a-f]{64}$/.test(sig||'')&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(sign(id),'hex'));
 if(!scope[2]&&request.method==='GET'){
  if(!valid)id='judge:'+randomUUID();
  return new Response(assets['reader.html'],{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",...(!valid?{'Set-Cookie':`pp_proof=${id}.${sign(id)}; Path=${scope[1]}; HttpOnly; SameSite=Strict; Secure; Max-Age=604800`}:{})}});
 }
 if(request.method!=='POST'||!valid||request.headers.get('Origin')!==url.origin)return json({error:'Open the technical reader to begin.'},403);
 if(!['api/consent','api/reevaluate'].includes(scope[2]))return json({error:'Technical proof has no study exposure or answer endpoint.'},404);
 if(scope[2]==='api/consent'&&(await request.json()).consent!==true)return json({error:'Consent required to open this technical proof.'},400);
 const flag=await providerFactory(key).evaluate(id);if(!flag.enabled||!['correction_note','evidence_time_machine'].includes(flag.value))return json({error:'Development provider evaluation unavailable.'},503);
 return json({...experience(facts,flag.value,'ab'),assigned_by:'Flagsmith',provider_variant:flag.variant,experiment_id:completion.id,experiment:flag.experiment??null,environment:'Development',mode:'ab',study_complete:true,technical_proof:true});
}
