import{readerSession,responseError}from'./reader-session.mjs';
import {randomUUID} from 'node:crypto';
import {hash} from './payload.mjs';
import {PROTOCOL,protocolHash,score} from './protocol.mjs';
// Shared edge/portable SQL transitions. batch() is transactional; outbox
// creation reads the stored first answer, never the retried request's score.
export class AsyncLedger {
 constructor(db,{run,environment,payload,clock=()=>Date.now()}){this.db=db;this.run=run;this.environment=environment;this.payload=payload;this.payloadHash=hash(payload);this.clock=clock;}
 q(sql,...args){return this.db.prepare(sql).bind(...args);}
 async initialize(){await this.q('INSERT OR IGNORE INTO runs VALUES(?,?,?,?)',this.run,this.environment,this.payloadHash,protocolHash).run();const r=await this.q('SELECT * FROM runs WHERE id=?',this.run).first();if(r.environment!==this.environment||r.payload_hash!==this.payloadHash||r.protocol_hash!==protocolHash)throw Error('Frozen run mismatch');}
 participant(id){return this.q('SELECT * FROM participants WHERE run=? AND identity=?',this.run,id).first();}
 async consent(id,{synthetic=false}={}){if(this.environment==='Production'&&(synthetic||id.startsWith('qa:')||id.startsWith('dev:')))throw Error('Synthetic Production study traffic prohibited');await this.q('INSERT OR IGNORE INTO participants(run,identity,consented_at) VALUES(?,?,?)',this.run,id,this.clock()).run();return this.participant(id);}
 async assign(id,f){
  if(!f.enabled||!f.experiment?.inExperiment||!Number.isInteger(f.experiment.id)||!['control','evidence_time_machine'].includes(f.variant)||!['correction_note','evidence_time_machine'].includes(f.value)||(f.variant==='control')!==(f.value==='correction_note'))throw Error('Provider assignment unavailable');
  await this.q('UPDATE participants SET quarantined=1 WHERE run=? AND identity=? AND variant IS NOT NULL AND (variant!=? OR experiment_id!=?)',this.run,id,f.variant,f.experiment.id).run();
  await this.q('UPDATE participants SET variant=?,value=?,experiment_id=?,assigned_at=COALESCE(assigned_at,?) WHERE run=? AND identity=? AND quarantined=0 AND (variant IS NULL OR (variant=? AND experiment_id=?))',f.variant,f.value,f.experiment.id,this.clock(),this.run,id,f.variant,f.experiment.id).run();
  const p=await this.participant(id);if(!p?.variant||p.quarantined)throw Error('Assignment drift or missing consent');return p;
 }
 async render(id){await this.q('UPDATE participants SET rendered_at=COALESCE(rendered_at,?) WHERE run=? AND identity=? AND variant IS NOT NULL AND quarantined=0',this.clock(),this.run,id).run();}
 async session(id){return readerSession(await this.participant(id),await this.q('SELECT submitted_at FROM answers WHERE run=? AND identity=?',this.run,id).first(),this.clock());}
 async expose(id,{payloadHash,visible,dwellMs}={}){
  if(payloadHash!==this.payloadHash||visible!==true||!Number.isFinite(dwellMs)||dwellMs<PROTOCOL.exposure_dwell_ms)throw Error('Meaningful display required');
  const now=this.clock();await this.db.batch([
   this.q('UPDATE participants SET exposed_at=COALESCE(exposed_at,?) WHERE run=? AND identity=? AND quarantined=0 AND rendered_at IS NOT NULL AND rendered_at<=?',now,this.run,id,now-PROTOCOL.exposure_dwell_ms),
   this.q(`INSERT OR IGNORE INTO outbox(id,run,identity,event,value,experiment_id,domain_at) SELECT ?,run,identity,'$flag_exposure',variant,experiment_id,exposed_at FROM participants WHERE run=? AND identity=? AND exposed_at IS NOT NULL AND quarantined=0`,randomUUID(),this.run,id)
  ]);const p=await this.participant(id);if(!p?.exposed_at||p.quarantined)throw Error('Meaningful display required');return {exposed:true,session:await this.session(id)};
 }
 async answer(id,option,payloadHash){
  if(payloadHash!==this.payloadHash)throw Error('Truth lock mismatch');
  const old=await this.q('SELECT * FROM answers WHERE run=? AND identity=?',this.run,id).first();if(old)return {...old,correct:!!old.correct,immutable:true};
  const correct=score(option,this.payload),now=this.clock();await this.db.batch([
   this.q(`INSERT OR IGNORE INTO answers(run,identity,option,correct,submitted_at) SELECT run,identity,?,?,? FROM participants WHERE run=? AND identity=? AND exposed_at IS NOT NULL AND exposed_at>? AND quarantined=0`,option,+correct,now,this.run,id,now-PROTOCOL.response_window_ms),
   this.q(`INSERT OR IGNORE INTO outbox(id,run,identity,event,value,experiment_id,domain_at) SELECT ?,a.run,a.identity,'proofpivot_revision_check_submitted',NULL,p.experiment_id,a.submitted_at FROM answers a JOIN participants p USING(run,identity) WHERE a.run=? AND a.identity=?`,randomUUID(),this.run,id),
   this.q(`INSERT OR IGNORE INTO outbox(id,run,identity,event,value,experiment_id,domain_at) SELECT ?,a.run,a.identity,'proofpivot_revision_check_correct',NULL,p.experiment_id,a.submitted_at FROM answers a JOIN participants p USING(run,identity) WHERE a.run=? AND a.identity=? AND a.correct=1`,randomUUID(),this.run,id)
  ]);const saved=await this.q('SELECT option,correct,submitted_at FROM answers WHERE run=? AND identity=?',this.run,id).first();if(!saved)throw responseError(await this.session(id));return {...saved,correct:!!saved.correct,immutable:true};
 }
 async lease(){const now=this.clock();return this.q(`UPDATE outbox SET status='SENDING',attempts=attempts+1,lease_until=? WHERE id=(SELECT o.id FROM outbox o JOIN participants p ON p.run=o.run AND p.identity=o.identity WHERE o.run=? AND p.quarantined=0 AND o.status IN ('PENDING','UNKNOWN','SENDING') AND o.lease_until<? AND (o.event='$flag_exposure' OR EXISTS(SELECT 1 FROM outbox e WHERE e.run=o.run AND e.identity=o.identity AND e.event='$flag_exposure' AND e.status='HTTP_ACCEPTED')) ORDER BY o.domain_at,CASE WHEN o.event='$flag_exposure' THEN 0 ELSE 1 END LIMIT 1) RETURNING *`,now+30000,this.run,now).first();}
 async delivery(row,status,detail){const now=this.clock();await this.db.batch([
  this.q('UPDATE outbox SET status=?,http_at=?,lease_until=?,detail=? WHERE id=?',status,now,status==='UNKNOWN'?now+30000:0,JSON.stringify(detail),row.id),
  this.q('INSERT INTO deliveries(outbox_id,at,status,detail) VALUES(?,?,?,?)',row.id,now,status,JSON.stringify(detail))
 ]);}
 async summary(){const[p,a,o]=await Promise.all([
  this.q('SELECT variant,COUNT(*) assigned,SUM(exposed_at IS NOT NULL) exposed,SUM(quarantined) quarantined FROM participants WHERE run=? GROUP BY variant',this.run).all(),
  this.q('SELECT p.variant,COUNT(*) submitted,SUM(a.correct) correct FROM answers a JOIN participants p USING(run,identity) WHERE a.run=? GROUP BY p.variant',this.run).all(),
  this.q('SELECT event,status,COUNT(*) count FROM outbox WHERE run=? GROUP BY event,status',this.run).all()
 ]);return {run:this.run,environment:this.environment,payload_hash:this.payloadHash,participants:p.results,answers:a.results,outbox:o.results};}
}
