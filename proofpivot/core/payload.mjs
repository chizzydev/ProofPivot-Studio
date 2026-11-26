import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical,deepFreeze,buildRevisionPayload} from './payload-core.mjs';
import {onsRevision} from './ons-fixture.mjs';
export {canonical,deepFreeze,ref,buildRevisionPayload,validateRevision} from './payload-core.mjs';
export {claims} from './ons-fixture.mjs';
export const hash=value=>createHash('sha256').update(canonical(value)).digest('hex');
// Compatibility adapter for the canonical fixture; all construction uses the public pipeline.
export function buildPayload(original,current){return buildRevisionPayload(onsRevision(original,current));}
export function loadPayload(){
 const source=id=>{
  const s=JSON.parse(readFileSync(new URL(`../sources/${id}.json`,import.meta.url),'utf8'));
  const actual=createHash('sha256').update(readFileSync(new URL(`../sources/${id}.html`,import.meta.url))).digest('hex');
  if(actual!==s.sha256)throw Error('Source capture integrity failure');return s;
 };
 return deepFreeze(buildPayload(source('ons-original'),source('ons-corrected')));
}
export function truthLock(control,treatment){const a=hash(control),b=hash(treatment);if(a!==b)throw Error('TRUTH_LOCK_MISMATCH');return a;}
// Same factual object for both renderers, never a pair of separately curated facts.
export function experience(payload,value,mode='ab'){if(!['correction_note','evidence_time_machine'].includes(value))throw Error('Unknown experience');return {facts:payload,renderer:mode==='aa'?'correction_note':value,correction_payload_hash:truthLock(payload,payload)};}
