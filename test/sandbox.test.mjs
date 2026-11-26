import test from 'node:test';import assert from 'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';import{createHash}from'node:crypto';
import{buildRevisionPayload,validateRevision,ref,canonical,lockPayloads}from'../proofpivot/core/payload-core.mjs';
import{runSandbox}from'../proofpivot/core/sandbox.mjs';import{serveSandbox}from'../proofpivot/core/sandbox-route.mjs';
import{loadPayload,hash}from'../proofpivot/core/payload.mjs';import{onsRevision}from'../proofpivot/core/ons-fixture.mjs';import{protocolHash}from'../proofpivot/core/protocol.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
const observation=(value,unit='USD',basis='nominal receipts')=>({value,unit,basis});
function input(a='10.01',b='10.02'){
 const original={id:'original',observations:{a:observation(a),b:observation('5'),c:observation('7')}},revised={id:'revised',observations:{a:observation(b),b:observation('5'),c:observation('7')}};
 const claim=(id,expression,precision=1,temporality='current')=>({id,label:id,sentence:'The result is {value}.',expression,precision,temporality});
 return{schema:1,witness:'Synthetic structured input',historical_replay:false,original,revised,claims:[claim('exact',ref('a'),2),claim('rounded',ref('a')),claim('separate',ref('c')),claim('historical',ref('a'),2,'historical'),claim('difference',{op:'difference',args:[ref('a'),ref('b')]},2),claim('percent',{op:'percent_change',args:[ref('a'),ref('b')]},2)]};
}
test('same runtime input repeats deterministically, with exact values, displays and shared hash',async()=>{
 const x=input(),first=await runSandbox(x);for(let i=0;i<25;i++){const r=await runSandbox(clone(x));assert.deepEqual(r.facts,first.facts);assert.equal(r.correction_payload_hash,first.correction_payload_hash);assert.equal(r.control.facts,r.treatment.facts);assert.equal(r.control.correction_payload_hash,r.treatment.correction_payload_hash);}
 assert.equal(hash(first.facts),first.correction_payload_hash);assert.equal(first.facts.claims[0].current_value.numerator,'1002');assert.equal(first.facts.claims[0].current_value.denominator,'100');
 assert.throws(()=>first.facts.claims[0].state='changed');const saved=first.facts.sources[0].observations.a.value;x.original.observations.a.value='99';assert.equal(first.facts.sources[0].observations.a.value,saved);
});
test('dependency isolation, precision preservation, unaffected and historical state derive from runtime inputs',()=>{
 const p=buildRevisionPayload(input());assert.deepEqual(p.claims.map(c=>c.state),['changed','precision_preserving','unaffected','historical','changed','changed']);assert.equal(p.claims[3].current_display,'10.01');assert.equal(p.claims[3].supported_release,'original');
 const x=input();x.revised.observations.c.value='8';const next=buildRevisionPayload(x);for(let i=0;i<p.claims.length;i++)if(i!==2)assert.deepEqual(next.claims[i],p.claims[i]);assert.equal(next.claims[2].state,'changed');
});
test('ONS is one generic fixture and its complete frozen payload hash is unchanged',()=>{
 const p=loadPayload(),generic=buildRevisionPayload(onsRevision(...p.sources));assert.deepEqual(generic,p);assert.equal(hash(p),'bb2f5722fed0b2e373f25c35d8e2fdb02cd4de5f1930ccf0b5dea242e051dec8');
});
test('actual BEA releases use the public pipeline without a publisher branch',()=>{
 const sources=['advance','second','third'].map(s=>JSON.parse(readFileSync(new URL(`../proofpivot/sources/bea-${s}.json`,import.meta.url))));
 const c={id:'growth',label:'Growth',sentence:'Growth was {value}%.',precision:1,expression:ref('growth')};
 const build=(a,b)=>buildRevisionPayload({schema:1,witness:'BEA',historical_replay:true,original:a,revised:b,claims:[c,{...c,id:'history',temporality:'historical'}]});
 assert.equal(build(sources[0],sources[1]).claims[0].state,'unaffected');const p=build(sources[1],sources[2]);assert.equal(p.claims[0].current_display,'2.2');assert.equal(p.claims[0].state,'changed');assert.equal(p.claims[1].current_display,'1.5');
});
test('malformed payloads, semantics, decimals, operations, precision and missing dependencies fail closed',()=>{
 const bad=[x=>delete x.revised.observations.a,x=>x.revised.observations.a.unit='EUR',x=>x.original.observations.b.basis='real receipts',x=>x.original.observations.a.value='1e3',x=>x.revised.observations.a.value='1,234',x=>x.original.observations.a.value=10,x=>x.claims[0].precision=-1,x=>x.claims[0].precision=13,x=>x.claims[0].precision=1.5,x=>x.claims[0].precision='2',x=>x.claims[0].expression.op='divide',x=>x.claims[0].expression.ref='missing',x=>x.claims[0].sentence='No placeholder',x=>x.claims[0].temporality='future',x=>x.claims[1].id=x.claims[0].id,x=>x.claims[4].expression.args=[],x=>x.claims=null,x=>x.original=null,x=>x.schema=2,x=>x.revised.observations.b.value='0'];
 for(const mutate of bad){const x=input();mutate(x);assert.throws(()=>buildRevisionPayload(x));}for(const x of [null,[],{},'payload',1])assert.throws(()=>validateRevision(x));
});
test('twenty sequential independent runs and resets leave no previous payload or result',async()=>{
 const previous=[];let session=null;for(let i=0;i<20;i++){session=null;const x=input(String(i+1),String(i+3));x.witness=`Independent scenario ${i}`;session=await runSandbox(x);assert.equal(session.facts.claims[0].current_display,`${i+3}.00`);assert.equal(session.facts.witness,`Independent scenario ${i}`);assert.equal(previous.some(p=>p.correction_payload_hash===session.correction_payload_hash),false);previous.push(session);}
 for(let i=0;i<20;i++)assert.equal(previous[i].facts.sources[1].observations.a.value,String(i+3));
});
test('generated integer-rational cases cover each supported operation and all precisions',()=>{
 let seed=81317;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const format=(n,d,p)=>{const negative=n<0n,a=negative?-n:n,scale=10n**BigInt(p);let q=a*scale/d;if((a*scale%d)*2n>=d)q++;let s=q.toString().padStart(p+1,'0');return(negative&&q?'-':'')+(p?s.slice(0,-p)+'.'+s.slice(-p):s);};
 for(let i=0;i<390;i++){
  const a=BigInt(random()%20001)-10000n,b=BigInt(random()%9999)+1n,delta=BigInt(random()%21)-10n,p=i%13;
  const x=input(a.toString(),(a+delta).toString());x.original.observations.b.value=x.revised.observations.b.value=b.toString();x.claims=x.claims.filter(c=>['exact','difference','percent'].includes(c.id));x.claims.forEach(c=>c.precision=p);const r=buildRevisionPayload(x).claims;
  const expected=[format(a+delta,1n,p),format(a+delta-b,1n,p),format((a+delta-b)*100n,b,p)];assert.deepEqual(r.map(c=>c.current_display),expected);
  for(const c of r)assert.equal(c.state,delta===0n?'unaffected':c.original_display===c.current_display?'precision_preserving':'changed');
 }
 for(let i=1;i<=40;i++){const x=input(`${i}.001`,`${i}.002`);x.claims=[{...x.claims[0],precision:2}];assert.equal(buildRevisionPayload(x).claims[0].state,'precision_preserving');}
});
test('truth lock rejects deliberately divergent factual renderer payloads',async()=>{const p=buildRevisionPayload(input()),changed=clone(p);changed.claims[0].current_display='99';await assert.rejects(lockPayloads(p,changed),/TRUTH_LOCK_MISMATCH/);});
test('sandbox static boundary needs no environment, provider, cookies or database and blocks event endpoints',async()=>{
 const assets={'sandbox.html':'sandbox','sandbox.js':'module','sandbox.css':'css','sandbox-schema.html':'schema','sandbox.mjs':'runtime','payload-core.mjs':'core','engine.mjs':'engine'};
 for(const path of ['/sandbox','/sandbox/','/sandbox.js','/sandbox.mjs','/payload-core.mjs','/engine.mjs','/sandbox-schema']){const r=serveSandbox(new Request('https://example.test'+path),assets);assert.equal(r.status,200);assert.equal(r.headers.get('Set-Cookie'),null);assert.match(r.headers.get('Content-Security-Policy'),/connect-src 'none'/);}
 for(const path of ['/sandbox/api/consent','/sandbox/api/exposure','/sandbox/api/answer'])assert.equal(serveSandbox(new Request('https://example.test'+path,{method:'POST'}),assets).status,404);
 assert.equal(serveSandbox(new Request('https://example.test/read/api/consent'),assets),null);
});
test('all frozen canonical study files, payload and protocol remain byte-identical',()=>{
 const frozen=JSON.parse(readFileSync(new URL('../study-freeze.json',import.meta.url)));assert.equal(protocolHash,frozen.protocol_hash);assert.equal(hash(loadPayload()),frozen.payload_hash);
 const local=new URL('../public/app.js',import.meta.url),assets=existsSync(local)?null:JSON.parse(readFileSync(new URL('../proofpivot/assets.json',import.meta.url)));
 for(const[f,h]of Object.entries(frozen.content_hashes)){const bytes=assets?Buffer.from(assets[f]):readFileSync(new URL('../public/'+f,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),h,`Frozen study content changed: ${f}`);}
});
