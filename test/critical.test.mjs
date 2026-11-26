import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{createHash}from'node:crypto';
import {Decimal,revise}from'../proofpivot/core/engine.mjs';
import {loadPayload,truthLock,experience,hash,ref}from'../proofpivot/core/payload.mjs';
import {Ledger}from'../proofpivot/core/ledger.mjs';import{decision,score}from'../proofpivot/core/protocol.mjs';
const payload=loadPayload(),ph=hash(payload);
const flag=(variant='control')=>({enabled:true,value:variant==='control'?'correction_note':'evidence_time_machine',variant,experiment:{id:519,inExperiment:true}});
function fixture({environment='Development',path=':memory:'}={}){let now=10000;const l=new Ledger(path,{payload,environment,clock:()=>now});return {l,advance:(n=2001)=>now+=n,expose(id='x'){l.consent(id);l.assign(id,flag());l.render(id);now+=2001;return l.expose(id,{payloadHash:ph,visible:true,dwellMs:2001});}};}
test('decimal arithmetic is exact, including negative and tie rounding',()=>{
 assert.equal(Decimal.of('0.1').add('0.2').format(1),'0.3');assert.equal(Decimal.of('-1.25').format(1),'-1.3');assert.equal(Decimal.of('1.25').format(1),'1.3');assert.equal(Decimal.of('1').div('3').format(12),'0.333333333333');assert.throws(()=>Decimal.of('1').div('0'));assert.throws(()=>Decimal.of('NaN'));
});
test('actual captured ONS bytes derive all three factual outcomes',()=>assert.deepEqual(payload.claims.map(c=>[c.original_display,c.current_display,c.state]),[['3287','3240','changed'],['4.5','4.5','precision_preserving'],['0.6','0.6','unaffected']]));
test('unrelated source and historical claims use the same engine',()=>{
 const source=value=>({id:value,observations:{x:{value,unit:'percent',basis:'annualized real output'}}});
 const claims=[{id:'current',expression:ref('x'),precision:1},{id:'historical',temporality:'historical',expression:ref('x'),precision:1}];
 assert.equal(revise(claims,source('1.5'),source('1.5'))[0].state,'unaffected');
 const result=revise(claims,source('1.5'),source('2.2'));assert.equal(result[0].current_display,'2.2');assert.equal(result[0].state,'changed');assert.equal(result[1].current_display,'1.5');assert.equal(result[1].supported_release,'1.5');
});
test('incompatible units and unknown dependencies fail closed',()=>{
 const c=[{expression:{op:'difference',args:[ref('a'),ref('b')]},precision:1}];const s={observations:{a:{value:'1',unit:'GBP',basis:'current'},b:{value:'2',unit:'USD',basis:'current'}}};assert.throws(()=>revise(c,s,s),/Incompatible/);assert.throws(()=>revise([{expression:ref('missing'),precision:1}],s,s),/Unknown/);
});
test('actual BEA release bytes preserve 1.5, 1.5, 2.2 and historical support',()=>{
 const sources=['advance','second','third'].map(id=>{const s=JSON.parse(readFileSync(new URL(`../proofpivot/sources/bea-${id}.json`,import.meta.url),'utf8'));assert.equal(createHash('sha256').update(readFileSync(new URL(`../proofpivot/sources/bea-${id}.html`,import.meta.url))).digest('hex'),s.sha256);return s;});
 assert.deepEqual(sources.map(s=>s.observations.growth.value),['1.5','1.5','2.2']);const c=[{expression:ref('growth'),precision:1},{expression:ref('growth'),precision:1,temporality:'historical'}];assert.equal(revise(c,sources[0],sources[1])[0].supported_release,sources[1].id);const changed=revise(c,sources[1],sources[2]);assert.equal(changed[0].current_display,'2.2');assert.equal(changed[1].current_display,'1.5');
});
test('both real renderers share one immutable payload and mismatch fails',()=>{
 const a=experience(payload,'correction_note'),b=experience(payload,'evidence_time_machine');assert.equal(a.facts,b.facts);assert.equal(a.correction_payload_hash,b.correction_payload_hash);assert.throws(()=>truthLock(payload,{...payload,schema:2}),/MISMATCH/);assert.throws(()=>payload.claims[0].current_display='999');assert.equal(experience(payload,'evidence_time_machine','aa').renderer,'correction_note');
});
test('assignment persists; drift quarantines; no outage fallback enrollment',()=>{const{l}=fixture();l.consent('x');assert.throws(()=>l.assign('x',{value:'correction_note'}));for(let i=0;i<20;i++)l.assign('x',flag());assert.throws(()=>l.assign('x',flag('evidence_time_machine')),/drift/);assert.equal(l.participant('x').quarantined,1);l.close();});
test('hidden/early render does not expose; duplicate exposure yields one event',()=>{const f=fixture();f.l.consent('x');f.l.assign('x',flag());f.l.render('x');assert.throws(()=>f.l.expose('x',{payloadHash:ph,visible:true,dwellMs:3000}));f.advance();assert.throws(()=>f.l.expose('x',{payloadHash:ph,visible:false,dwellMs:3000}));f.l.expose('x',{payloadHash:ph,visible:true,dwellMs:3000});f.l.expose('x',{payloadHash:ph,visible:true,dwellMs:3000});assert.equal(f.l.summary().outbox[0].count,1);f.l.close();});
test('first complete incorrect answer cannot become conversion',()=>{const f=fixture();f.expose();assert.throws(()=>f.l.answer('x',null,ph));const a=f.l.answer('x',0,ph),b=f.l.answer('x',1,ph);assert.equal(a.correct,false);assert.equal(b.correct,false);assert.equal(b.option,0);assert.equal(f.l.summary().outbox.some(r=>r.event.endsWith('_correct')),false);f.l.close();});
test('backend score, identity and exposure prerequisites own conversion',()=>{const f=fixture();assert.throws(()=>f.l.answer('x',1,ph));f.expose();assert.throws(()=>f.l.answer('other',1,ph));assert.throws(()=>f.l.answer('x',1,'wrong'));assert.equal(score(1,payload),true);assert.equal(f.l.answer('x',1,ph).correct,true);assert.equal(f.l.summary().outbox.length,3);f.l.close();});
test('conversion leases only after accepted exposure; rejected is not accepted',()=>{const f=fixture();f.expose();f.l.answer('x',1,ph);const e=f.l.lease();assert.equal(e.event,'$flag_exposure');f.l.delivery(e,'REJECTED',{accepted:0});assert.equal(f.l.lease(),null);f.l.close();});
test('outbox survives restart and uncertain transport lease; no duplicate outcome',()=>{
 const dir=mkdtempSync(join(tmpdir(),'proofpivot-'));try{const path=join(dir,'ledger.sqlite');let f=fixture({path});f.expose();f.l.answer('x',1,ph);const row=f.l.lease();f.l.delivery(row,'UNKNOWN',{reason:'crash after send'});f.l.close();f=fixture({path});assert.equal(f.l.lease(),null);f.advance(40000);const retry=f.l.lease();assert.equal(retry.id,row.id);f.l.delivery(retry,'HTTP_ACCEPTED',{accepted:1});assert.notEqual(f.l.lease().event,'$flag_exposure');assert.equal(f.l.answer('x',0,ph).correct,true);f.l.close();}finally{rmSync(dir,{recursive:true,force:true});}
});
test('response deadline cannot be reset by another render',()=>{const f=fixture();f.expose();f.advance(180001);f.l.render('x');assert.throws(()=>f.l.answer('x',1,ph),/expired/);f.l.close();});
test('production synthetic consent is rejected; changed contract cannot reuse run',()=>{const f=fixture({environment:'Production'});assert.throws(()=>f.l.consent('qa:x',{synthetic:true}));f.l.close();const dir=mkdtempSync(join(tmpdir(),'proofpivot-'));try{const path=join(dir,'ledger.sqlite');const a=fixture({path});a.l.close();assert.throws(()=>new Ledger(path,{payload:{...payload,schema:2},run:'dev-aa-v1'}),/mismatch/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('no manufactured winner from data floor, crossing interval or integrity fault',()=>{assert.equal(decision(),'DO_NOT_ACT');assert.equal(decision({integrity:true}),'COLLECTING_DATA');const base={integrity:true,identities:[100,100],conversions:[50,53]};assert.equal(decision({...base,interval:[-1,3],guardrailHealthy:true}),'INCONCLUSIVE');assert.equal(decision({...base,interval:[1,3]}),'DO_NOT_ACT');assert.equal(decision({...base,interval:[1,3],guardrailHealthy:true}),'HUMAN_DECISION_REQUIRED');assert.equal(decision({...base,interval:[-3,-1]}),'RETAIN_CONTROL');});
