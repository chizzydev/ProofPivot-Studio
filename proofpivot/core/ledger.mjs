import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {PROTOCOL,score,protocolHash} from './protocol.mjs';
import {hash} from './payload.mjs';
export class Ledger {
 constructor(path,{run='dev-aa-v1',environment='Development',payload,clock=()=>Date.now()}={}){
  if(!payload)throw Error('Canonical payload required');
  this.payload=payload;this.payloadHash=hash(payload);this.run=run;this.environment=environment;this.clock=clock;
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,environment TEXT NOT NULL,payload_hash TEXT NOT NULL,protocol_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS participants(run TEXT NOT NULL,identity TEXT NOT NULL,consented_at INTEGER NOT NULL,variant TEXT,value TEXT,experiment_id INTEGER,assigned_at INTEGER,rendered_at INTEGER,exposed_at INTEGER,quarantined INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(run,identity));
  CREATE TABLE IF NOT EXISTS answers(run TEXT NOT NULL,identity TEXT NOT NULL,option INTEGER NOT NULL,correct INTEGER NOT NULL,submitted_at INTEGER NOT NULL,PRIMARY KEY(run,identity));
  CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,run TEXT NOT NULL,identity TEXT NOT NULL,event TEXT NOT NULL,value TEXT,experiment_id INTEGER NOT NULL,domain_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,http_at INTEGER,detail TEXT,UNIQUE(run,identity,event));
  CREATE TABLE IF NOT EXISTS deliveries(id INTEGER PRIMARY KEY,outbox_id TEXT NOT NULL,at INTEGER NOT NULL,status TEXT NOT NULL,detail TEXT);
  `);
  this.db.prepare('INSERT OR IGNORE INTO runs VALUES(?,?,?,?)').run(run,environment,this.payloadHash,protocolHash);
  const saved=this.db.prepare('SELECT * FROM runs WHERE id=?').get(run);
  if(saved.environment!==environment||saved.payload_hash!==this.payloadHash||saved.protocol_hash!==protocolHash){this.db.close();throw Error('Frozen run contract mismatch: new run required');}
 }
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 participant(id){return this.db.prepare('SELECT * FROM participants WHERE run=? AND identity=?').get(this.run,id);}
 consent(id,{synthetic=false}={}){if(this.environment==='Production'&&synthetic)throw Error('No synthetic Production study traffic');this.db.prepare('INSERT OR IGNORE INTO participants(run,identity,consented_at) VALUES(?,?,?)').run(this.run,id,this.clock());return this.participant(id);}
 assign(id,flag){
  if(!flag.enabled||!flag.experiment?.inExperiment||!Number.isInteger(flag.experiment.id)||!['control','evidence_time_machine'].includes(flag.variant)||!['correction_note','evidence_time_machine'].includes(flag.value))throw Error('No valid running Flagsmith assignment');
  if((flag.variant==='control')!==(flag.value==='correction_note'))throw Error('Provider value/key mismatch');
  const old=this.participant(id);if(!old)throw Error('Consent required');
  if(old.variant&&(old.variant!==flag.variant||old.experiment_id!==flag.experiment.id)){this.db.prepare('UPDATE participants SET quarantined=1 WHERE run=? AND identity=?').run(this.run,id);throw Error('Assignment drift: identity quarantined');}
  this.db.prepare('UPDATE participants SET variant=?,value=?,experiment_id=?,assigned_at=COALESCE(assigned_at,?) WHERE run=? AND identity=?').run(flag.variant,flag.value,flag.experiment.id,this.clock(),this.run,id);return this.participant(id);
 }
 render(id){const p=this.participant(id);if(!p?.variant||p.quarantined)throw Error('Valid assignment required');this.db.prepare('UPDATE participants SET rendered_at=COALESCE(rendered_at,?) WHERE run=? AND identity=?').run(this.clock(),this.run,id);}
 enqueue(p,event,value,at){this.db.prepare('INSERT OR IGNORE INTO outbox(id,run,identity,event,value,experiment_id,domain_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),this.run,p.identity,event,value,p.experiment_id,at);}
 expose(id,{payloadHash,visible,dwellMs}={}){
  const p=this.participant(id),now=this.clock();
  if(!p?.rendered_at||p.quarantined||payloadHash!==this.payloadHash||visible!==true||dwellMs<PROTOCOL.exposure_dwell_ms||now-p.rendered_at<PROTOCOL.exposure_dwell_ms)throw Error('Meaningful display required');
  return this.transaction(()=>{if(!p.exposed_at){this.db.prepare('UPDATE participants SET exposed_at=? WHERE run=? AND identity=?').run(now,this.run,id);this.enqueue(p,'$flag_exposure',p.variant,now);}return {exposed:true};});
 }
 answer(id,option,payloadHash){
  if(payloadHash!==this.payloadHash)throw Error('Truth lock mismatch');
  return this.transaction(()=>{
   const old=this.db.prepare('SELECT option,correct,submitted_at FROM answers WHERE run=? AND identity=?').get(this.run,id);if(old)return {...old,correct:!!old.correct,immutable:true};
   const p=this.participant(id),now=this.clock();
   if(!p?.exposed_at||p.quarantined)throw Error('Exposure required');
   if(now-p.exposed_at>PROTOCOL.response_window_ms)throw Error('Response window expired');
   const correct=score(option,this.payload);
   this.db.prepare('INSERT INTO answers VALUES(?,?,?,?,?)').run(this.run,id,option,+correct,now);
   this.enqueue(p,'proofpivot_revision_check_submitted',null,now);
   if(correct)this.enqueue(p,'proofpivot_revision_check_correct',null,now);
   return {option,correct,submitted_at:now,immutable:true};
  });
 }
 lease(){return this.transaction(()=>{
  const now=this.clock();
  const row=this.db.prepare(`SELECT o.* FROM outbox o JOIN participants p ON p.run=o.run AND p.identity=o.identity WHERE o.run=? AND p.quarantined=0 AND o.status IN ('PENDING','UNKNOWN','SENDING') AND o.lease_until<? AND (o.event='$flag_exposure' OR EXISTS(SELECT 1 FROM outbox e WHERE e.run=o.run AND e.identity=o.identity AND e.event='$flag_exposure' AND e.status='HTTP_ACCEPTED')) ORDER BY o.domain_at, CASE WHEN o.event='$flag_exposure' THEN 0 ELSE 1 END LIMIT 1`).get(this.run,now);
  if(!row)return null;this.db.prepare("UPDATE outbox SET status='SENDING',lease_until=?,attempts=attempts+1 WHERE id=?").run(now+30000,row.id);return row;
 });}
 delivery(row,status,detail){const now=this.clock();this.transaction(()=>{this.db.prepare('UPDATE outbox SET status=?,http_at=?,lease_until=?,detail=? WHERE id=?').run(status,now,status==='UNKNOWN'?now+30000:0,JSON.stringify(detail),row.id);this.db.prepare('INSERT INTO deliveries(outbox_id,at,status,detail) VALUES(?,?,?,?)').run(row.id,now,status,JSON.stringify(detail));});}
 summary(){return {run:this.run,environment:this.environment,payload_hash:this.payloadHash,participants:this.db.prepare(`SELECT variant,COUNT(*) assigned,SUM(exposed_at IS NOT NULL) exposed,SUM(quarantined) quarantined FROM participants WHERE run=? GROUP BY variant`).all(this.run),answers:this.db.prepare(`SELECT p.variant,COUNT(*) submitted,SUM(a.correct) correct FROM answers a JOIN participants p USING(run,identity) WHERE a.run=? GROUP BY p.variant`).all(this.run),outbox:this.db.prepare('SELECT event,status,COUNT(*) count FROM outbox WHERE run=? GROUP BY event,status').all(this.run)};}
 close(){this.db.close();}
}
