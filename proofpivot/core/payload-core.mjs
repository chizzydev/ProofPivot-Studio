// Portable public payload pipeline. No files, provider, identity, events or persistence.
import {revise,dependencies,Decimal,evaluate} from './engine.mjs';
export const ref=id=>({op:'observation',ref:id});
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export function deepFreeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(deepFreeze);Object.freeze(o);}return o;}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function need(ok,message){if(!ok)throw Error(message);}
function text(v,name,max=500){need(typeof v==='string'&&v.trim().length>0&&v.length<=max,`Invalid ${name}`);}
function identifier(v){text(v,'identifier',80);need(/^[A-Za-z][A-Za-z0-9_-]*$/.test(v)&&!['__proto__','prototype','constructor'].includes(v),'Invalid identifier');}
function expression(e,depth=0){
 need(object(e)&&depth<=4,'Malformed expression');
 if(e.op==='observation'){identifier(e.ref);need(Object.keys(e).every(k=>['op','ref'].includes(k)),'Malformed observation expression');return;}
 need(['difference','percent_change'].includes(e.op),'Unsupported operation');
 need(Object.keys(e).every(k=>['op','args'].includes(k))&&Array.isArray(e.args)&&e.args.length===2,'Binary expression required');e.args.forEach(a=>expression(a,depth+1));
}
export function validateRevision(input){
 need(object(input),'Malformed payload');need(input.schema===1,'Unsupported schema');
 text(input.witness,'witness',200);need(typeof input.historical_replay==='boolean','Invalid replay flag');
 for(const [label,s]of [['original',input.original],['revised',input.revised]]){
  need(object(s),`Missing ${label} source`);identifier(s.id);need(object(s.observations),'Malformed observations');
  const entries=Object.entries(s.observations);need(entries.length>0&&entries.length<=40,'Provide 1–40 observations');
  for(const[k,o]of entries){identifier(k);need(object(o),'Malformed observation');text(o.unit,'unit',100);text(o.basis,'basis',200);if(o.label!==undefined)text(o.label,'observation label',160);if(o.period!==undefined)text(o.period,'period',100);
   need(typeof o.value==='string'&&o.value.length<=100&&/^-?\d+(\.\d+)?$/.test(o.value),'Malformed decimal; use a plain decimal string');Decimal.of(o.value);
  }
 }
 need(input.original.id!==input.revised.id,'Source identifiers must differ');
 need(Array.isArray(input.claims)&&input.claims.length>0&&input.claims.length<=30,'Provide 1–30 claims');const ids=new Set();
 for(const c of input.claims){
  need(object(c),'Malformed claim');identifier(c.id);need(!ids.has(c.id),'Duplicate claim identifier');ids.add(c.id);text(c.label,'claim label',160);text(c.sentence,'sentence',500);
  need(c.sentence.split('{value}').length===2,'Sentence must contain exactly one {value} placeholder');
  need(Number.isInteger(c.precision)&&c.precision>=0&&c.precision<=12,'Invalid precision; use an integer from 0 to 12');
  need(c.temporality===undefined||['current','historical'].includes(c.temporality),'Invalid temporality');expression(c.expression);
  for(const dep of dependencies(c.expression)){
   need(Object.hasOwn(input.original.observations,dep)&&Object.hasOwn(input.revised.observations,dep),`Missing dependency: ${dep}`);
   const a=input.original.observations[dep],b=input.revised.observations[dep];
   need(a.unit===b.unit&&a.basis===b.basis,`Incompatible units/bases across releases: ${dep}`);
  }
  // Also validate revised historical inputs: history never licenses malformed current data.
  evaluate(c.expression,input.original.observations);evaluate(c.expression,input.revised.observations);
 }
 return input;
}
export function buildRevisionPayload(input){
 validateRevision(input);
 const {original,revised,claims,witness,historical_replay}=JSON.parse(JSON.stringify(input));
 return deepFreeze({schema:1,witness,historical_replay,sources:[original,revised],claims:revise(claims,original,revised)});
}
export async function payloadHash(payload){const bytes=new TextEncoder().encode(canonical(payload));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
export async function lockPayloads(control,treatment){const[a,b]=await Promise.all([payloadHash(control),payloadHash(treatment)]);if(a!==b)throw Error('TRUTH_LOCK_MISMATCH');return a;}
