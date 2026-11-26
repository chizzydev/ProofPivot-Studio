import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {revise} from './engine.mjs';
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export const hash=value=>createHash('sha256').update(canonical(value)).digest('hex');
export const ref=id=>({op:'observation',ref:id});
const expr=(op,a,b)=>({op,args:[ref(a),ref(b)]});
export const claims=[
 {id:'quarter-difference',label:'The quarter-to-quarter increase',subject:'Gross operating surplus of corporations, excluding alignment',sentence:'Between Q1 and Q2 2025, the published figure increased by £{value} million.',precision:0,expression:expr('difference','gos-Q2-2025','gos-Q1-2025')},
 {id:'annual-change',label:'The one-decimal annual comparison',subject:'The same Table 3 series',sentence:'In Q1 2026, the published figure was {value}% higher than a year earlier.',precision:1,expression:expr('percent_change','gos-Q1-2026','gos-Q1-2025')},
 {id:'headline-growth',label:'The separate GDP headline',subject:'UK real GDP, quarterly growth',sentence:'UK real GDP grew by {value}% in Q1 2026.',precision:1,expression:ref('real-gdp-q1-2026')}
];
export function buildPayload(original,current){return {schema:1,witness:'ONS GDP-D3',historical_replay:true,sources:[original,current],claims:revise(claims,original,current)};}
export function loadPayload(){
 const source=id=>{
  const s=JSON.parse(readFileSync(new URL(`../sources/${id}.json`,import.meta.url),'utf8'));
  const actual=createHash('sha256').update(readFileSync(new URL(`../sources/${id}.html`,import.meta.url))).digest('hex');
  if(actual!==s.sha256)throw Error('Source capture integrity failure');return s;
 };
 return deepFreeze(buildPayload(source('ons-original'),source('ons-corrected')));
}
export function deepFreeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(deepFreeze);Object.freeze(o);}return o;}
export function truthLock(control,treatment){const a=hash(control),b=hash(treatment);if(a!==b)throw Error('TRUTH_LOCK_MISMATCH');return a;}
// Same factual object for both renderers, never a pair of separately curated facts.
export function experience(payload,value,mode='ab'){if(!['correction_note','evidence_time_machine'].includes(value))throw Error('Unknown experience');return {facts:payload,renderer:mode==='aa'?'correction_note':value,correction_payload_hash:truthLock(payload,payload)};}
