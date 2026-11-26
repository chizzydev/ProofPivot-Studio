import test from'node:test';import assert from'node:assert/strict';import{readFileSync,existsSync}from'node:fs';
import{productionAuthorized,enrollmentOpen,frozenRuntimeManifest,closedReader}from'../proofpivot/core/study-gate.mjs';import{loadPayload,hash}from'../proofpivot/core/payload.mjs';import{protocolHash}from'../proofpivot/core/protocol.mjs';
const frozen=JSON.parse(readFileSync(new URL('../study-freeze.json',import.meta.url))),facts=loadPayload();
const base={run:'prod-human-pilot-v1',environment:'Production',environment_id:116183,project_id:53981,feature_id:304953,variant_id:36968,experiment_id:578,candidate_hash:frozen.candidate_hash,payload_hash:frozen.payload_hash,protocol_hash:frozen.protocol_hash,mode:'ab',role:'pilot',preflight_only:true,production_gate_verified:true,protocol_status:'FROZEN_CANDIDATE_AWAITING_HUMAN_APPROVAL'};
const assets=existsSync(new URL('../public/app.js',import.meta.url))?Object.fromEntries(Object.keys(frozen.content_hashes).map(f=>[f,readFileSync(new URL('../public/'+f,import.meta.url),'utf8')])):JSON.parse(readFileSync(new URL('../proofpivot/assets.json',import.meta.url)));
test('closed reader keeps frozen HTML unchanged and visibly disables enrollment with body attributes',()=>{const html=assets['reader.html'],gated=closedReader(html);assert.match(gated,/Enrollment is CLOSED\./);assert.match(gated,/id="begin" disabled aria-disabled="true"/);assert(gated.includes('<body class="reader-body">'));assert.equal(assets['reader.html'],html);});
test('Production enrollment requires both exact editor-approved contract and explicit opening',()=>{
 assert.equal(enrollmentOpen(base,'Production','closed',frozen),false);assert.equal(enrollmentOpen(base,'Production','open',frozen),false);
 const approved={...base,preflight_only:false,protocol_status:'FROZEN',human_editor_approved_at:'2026-11-26T14:00:00Z',human_editor_approval_candidate_hash:frozen.candidate_hash};
 assert.equal(productionAuthorized(approved,frozen),true);assert.equal(enrollmentOpen(approved,'Production','closed',frozen),false);assert.equal(enrollmentOpen(approved,'Production','open',frozen),true);
 for(const change of [{preflight_only:true},{human_editor_approved_at:null},{human_editor_approval_candidate_hash:'wrong'},{candidate_hash:'wrong'},{experiment_id:519},{environment_id:116182},{feature_id:1},{protocol_status:'CANDIDATE'},{production_gate_verified:false}])assert.equal(enrollmentOpen({...approved,...change},'Production','open',frozen),false);
});
test('deployed preflight manifest derives actual frozen bytes and calls only environment evaluation',async()=>{
 let calls=0;const provider={evaluateEnvironment:async()=>{calls++;return{enabled:false,value:'correction_note',variant:null,experiment:null};},evaluate:()=>{throw Error('Identity must not be evaluated');},send:()=>{throw Error('Event must not be sent');}};
 const args={run:base,environment:'Production',enrollment:'closed',facts,protocolHash,assets,frozen,hash,provider},manifest=await frozenRuntimeManifest(args);
 assert.equal(calls,1);assert.equal(manifest.enrollment,'CLOSED');assert.equal(manifest.human_editor_approved,false);assert.equal(manifest.payload_hash,frozen.payload_hash);assert.deepEqual(manifest.content_hashes,frozen.content_hashes);assert.equal(manifest.control.key,'control');assert.equal(manifest.treatment.key,'evidence_time_machine');
 await assert.rejects(frozenRuntimeManifest({...args,run:{...base,experiment_id:1}}),/mismatch/);await assert.rejects(frozenRuntimeManifest({...args,assets:{...assets,'app.js':'changed'}}),/mismatch/);
 await assert.rejects(frozenRuntimeManifest({...args,provider:{evaluateEnvironment:async()=>({enabled:true,value:'correction_note'})}}),/Unexpected active/);
});
