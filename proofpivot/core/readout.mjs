export function binomialSrm(a,b){const n=a+b;if(!n)return null;let c=1n,total=0n;for(let k=0;k<=n;k++){if(Math.abs(2*k-n)>=Math.abs(a-b))total+=c;if(k<n)c=c*BigInt(n-k)/BigInt(k+1);}return Number(total)/Number(2n**BigInt(n));}
export function readout(snapshot,ledger){
 const r=snapshot?.results?.results,metrics=r?.payload?.metrics||[];
 const definitions=snapshot?.experiment?.metrics||[];
 const primaryId=definitions.find(m=>m.metric_name==='ProofPivot Revision Check Correct')?.metric;
 const guardrailId=definitions.find(m=>m.metric_name==='ProofPivot Revision Check Submitted')?.metric;
 const primary=metrics.find(m=>m.metric_id===primaryId),guardrail=metrics.find(m=>m.metric_id===guardrailId);
 const result={status:'COLLECTING_DATA',provider_as_of:r?.as_of??null,primary:primary??null,guardrail:guardrail??null,discrepancies:[],native_srm_p_value:r?.payload?.srm_p_value??null};
 if(!r||!primary)return result;
 if(snapshot.run?.run!==ledger.run){result.status='DO_NOT_ACT';result.discrepancies.push('Provider snapshot belongs to a different run');return result;}
 for(const row of ledger.participants){const p=primary.variants?.[row.variant],g=guardrail?.variants?.[row.variant],answer=ledger.answers.find(a=>a.variant===row.variant);if(!p||p.n!==row.exposed||p.sum!==(answer?.correct||0)||!g||g.sum!==(answer?.submitted||0))result.discrepancies.push(`${row.variant}: aggregate counts differ`);if(row.quarantined)result.discrepancies.push('Quarantined identities');}
 if(ledger.outbox.some(o=>o.status!=='HTTP_ACCEPTED'))result.discrepancies.push('Unresolved transport');
 const counts=ledger.participants.map(r=>r.exposed);result.independent_srm_p_value=counts.length===2?binomialSrm(...counts):null;
 if(result.independent_srm_p_value!==null&&result.independent_srm_p_value<.001)result.discrepancies.push('Sample-ratio warning');
 if(result.native_srm_p_value!==null&&result.native_srm_p_value<.001)result.discrepancies.push('Provider sample-ratio warning');
 if(snapshot.exposures?.exposures?.payload?.excluded_identities)result.discrepancies.push('Provider excluded identities');
 if(result.discrepancies.length){result.status='DO_NOT_ACT';return result;}
 const arms=Object.values(primary.variants||{});if(arms.length!==2||arms.some(a=>a.n<50||a.sum<5))return result;
 const ci=primary.inference?.evidence_time_machine;result.interval=ci?[ci.ci_low,ci.ci_high]:null;result.chance_to_win=ci?.chance_to_win??null;result.relative_lift=ci?.lift??null;
 result.status=!ci?'COLLECTING_DATA':ci.ci_low<=0&&ci.ci_high>=0?'INCONCLUSIVE':'HUMAN_REVIEW_REQUIRED';
 return result;
}
