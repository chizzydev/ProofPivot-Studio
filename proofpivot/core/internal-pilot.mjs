import{hash,deepFreeze}from'./payload.mjs';
export const INTERNAL_PILOT=deepFreeze({version:'internal-pilot-v1',design:'internal_pilot',initial_cohort_max:20,minimum_review_exposed:10,participants_belong_to_actual_study:true,retain_on_pass:true,local_pilot_exclusions:false,early_arm_performance_review:false,review_scope:['consent_flow','task_understood','no_question_ambiguity','participant_ui','stable_identity','meaningful_exposure','first_answer_immutable','event_delivery','provider_local_reconciliation','no_cross_arm_contamination','no_material_integrity_failure'],material_fields:['factual_payload','control','treatment','comprehension_question','answer_key','scoring','exposure_semantics','primary_metric','guardrail','experiment_assignment'],outcomes:{PASS:'Keep all initial participants and real provider events; continue the same frozen experiment/run.',INVALIDATE:'Close enrollment; invalidate the entire run for inference; retain all local/provider records; require a new experiment AND run with a corrected frozen contract and start from zero.'}});
export const studyDesignHash=hash(INTERNAL_PILOT);
export function validateReview(input,summary){
 if(!input||!['PASS','INVALIDATE'].includes(input.decision)||typeof input.early_arm_performance_reviewed!=='boolean'||typeof input.editor_note!=='string'||!input.editor_note.trim())throw Error('Explicit operational-only editor review required');
 if(!Array.isArray(input.material_changes)||input.material_changes.some(k=>!INTERNAL_PILOT.material_fields.includes(k)))throw Error('Invalid material-change declaration');
 if(input.decision==='PASS'){
  if(input.early_arm_performance_reviewed||input.material_changes.length||!INTERNAL_PILOT.review_scope.every(k=>input.checks?.[k]===true)||summary.exposed<10||summary.submitted<10||summary.admissions>20||summary.quarantined||summary.unresolved)throw Error('Internal pilot cannot pass');
  const p=input.provider_reconciliation;
  if(p?.environment_id!==116183||p.warehouse_id!==8219||p.status!=='connected'||p.total_events_received!==summary.events+1||p.unique_events_count!==summary.events+1||!Number.isFinite(Date.parse(p.observed_at))||Math.abs(Date.now()-Date.parse(p.observed_at))>300000)throw Error('Fresh pooled provider reconciliation required');
 }
 return input.decision==='PASS'?'INTERNAL_PILOT_PASS':'INVALIDATED';
}
export function assertFreshRestart(invalidated,next){if(next.run===invalidated.run||next.experiment_id===invalidated.experiment_id||!next.contract_frozen||next.participant_count!==0)throw Error('Fresh experiment, run, frozen contract and zero participants required');return true;}
export class InternalPilot{
 constructor(db,run){this.db=db;this.run=run;}
 q(sql,...args){return this.db.prepare(sql).bind(...args);}
 async phase(){const r=await this.q('SELECT decision FROM internal_pilot_reviews WHERE run=? ORDER BY id DESC LIMIT 1',this.run).first();if(r?.decision==='INVALIDATE')return'INVALIDATED';if(r?.decision==='PASS')return'INTERNAL_PILOT_PASS';const n=await this.q('SELECT COUNT(*) n FROM internal_pilot_slots WHERE run=?',this.run).first();return n.n>=20?'INTERNAL_PILOT_REVIEW_HOLD':'INTERNAL_PILOT_COLLECTING';}
 async reserve(identity){
  const phase=await this.phase();if(phase==='INVALIDATED')throw Error('Entire study run invalidated');if(phase==='INTERNAL_PILOT_PASS')return;
  await this.q('INSERT OR IGNORE INTO internal_pilot_slots(run,identity,at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM internal_pilot_slots WHERE run=?)<20',this.run,identity,Date.now(),this.run).run();
  if(await this.phase()==='INVALIDATED')throw Error('Entire study run invalidated');
  if(!(await this.q('SELECT identity FROM internal_pilot_slots WHERE run=? AND identity=?',this.run,identity).first())&&await this.phase()!=='INTERNAL_PILOT_PASS')throw Error('Internal pilot review hold; no further enrollment');
 }
 async operational(){
  const p=await this.q('SELECT COUNT(*) admissions,COALESCE(SUM(exposed_at IS NOT NULL),0) exposed,COALESCE(SUM(quarantined),0) quarantined FROM participants WHERE run=? AND variant IS NOT NULL',this.run).first();
  const a=await this.q('SELECT COUNT(*) submitted FROM answers WHERE run=?',this.run).first();
  const o=await this.q("SELECT COUNT(*) events,COALESCE(SUM(status!='HTTP_ACCEPTED'),0) unresolved FROM outbox WHERE run=?",this.run).first();
  return{...p,...a,...o,phase:await this.phase(),performance_withheld:true,initial_participants_retained:true,local_exclusions:0};
 }
 async review(input){const summary=await this.operational(),phase=await this.phase();if(phase==='INVALIDATED'||phase==='INTERNAL_PILOT_PASS'&&input.decision==='PASS')throw Error('Review outcome is immutable');const next=validateReview(input,summary);await this.q("INSERT INTO internal_pilot_reviews(run,decision,at,payload) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM internal_pilot_reviews WHERE run=? AND (decision='INVALIDATE' OR decision=?))",this.run,input.decision,Date.now(),JSON.stringify(input),this.run,input.decision).run();if(await this.phase()!==next)throw Error('Review outcome is immutable');return{phase:next,enrollment_closed:next==='INVALIDATED',all_records_preserved:true,fresh_run_required:next==='INVALIDATED'};}
}
