import {Flagsmith} from '@flagsmith/nodejs';
import {FLAG} from './contract.mjs';
export class Provider {
 constructor(environmentKey){this.key=environmentKey;this.sdk=new Flagsmith({environmentKey,enableLocalEvaluation:false,enableEvents:false,requestTimeoutSeconds:8});}
 async evaluate(identity){const flags=await this.sdk.getIdentityFlags(identity);const f=flags.getFlag(FLAG);return {enabled:f.enabled,value:f.value,variant:f.variant,experiment:f.experiment};}
 async evaluateEnvironment(){const flags=await this.sdk.getEnvironmentFlags();const f=flags.getFlag(FLAG);return {enabled:f.enabled,value:f.value,variant:f.variant??null,experiment:f.experiment??null};}
 async send(row,environment){
  if(environment==='Production'&&(row.identity.startsWith('qa:')||row.identity.startsWith('dev:')))throw Error('Synthetic Production study traffic prohibited');
  const outcomes=[];
  // One durable row per SDK client makes batch acknowledgements unambiguous.
  const sdk=new Flagsmith({environmentKey:this.key,enableEvents:true,enableLocalEvaluation:false,fetch:async(url,init)=>{
   const response=await fetch(url,init);let body;try{body=await response.clone().json();}catch{}
   outcomes.push({http_status:response.status,accepted:body?.accepted,rejected:body?.rejected});return response;
  }});
  const metadata={logical_event_id:row.id,run:row.run,domain_at:new Date(row.domain_at).toISOString(),experiment_id:row.experiment_id};
  if(row.event==='$flag_exposure')sdk.trackExposureEvent(FLAG,{identifier:row.identity,value:row.value,metadata});
  else sdk.trackEvent(row.event,{identifier:row.identity,metadata});
  await sdk.close(15000);
  if(outcomes.some(o=>o.http_status>=200&&o.http_status<300&&o.accepted===1&&o.rejected?.length===0))return {status:'HTTP_ACCEPTED',outcomes};
  if(outcomes.some(o=>o.rejected?.length||[400,401,403,422].includes(o.http_status)))return {status:'REJECTED',outcomes};
  return {status:'UNKNOWN',outcomes};
 }
}
export async function drain(ledger,provider,{max=100}={}){
 let sent=0;
 for(;sent<max;sent++){
  const row=await ledger.lease();if(!row)break;
  try{const result=await provider.send(row,ledger.environment);await ledger.delivery(row,result.status,result.outcomes);if(result.status!=='HTTP_ACCEPTED')break;}
  catch{await ledger.delivery(row,'UNKNOWN',{reason:'Transport unresolved; credentials suppressed'});break;}
 }
 return sent;
}
