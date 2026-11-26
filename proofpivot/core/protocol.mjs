import {hash,deepFreeze} from './payload.mjs';
export const PROTOCOL={version:'ons-editorial-action-v2-candidate',status:'CANDIDATE_UNTIL_HUMAN_APPROVAL',exposure_dwell_ms:2000,exposure_rule:'Assigned explanation rendered; first factual sentence at least 50% visible in a visible document for 2000 cumulative milliseconds. Same rule in both arms.',response_window_ms:180000,question:'You are updating this article today. Which action is correct?',order:[],options:[
 {label:'Keep the Q1-to-Q2 increase, revise the one-decimal annual comparison, and leave the real GDP headline alone.',actions:['retain','update','retain']},
 {label:'Revise the Q1-to-Q2 increase, keep the one-decimal annual comparison, and leave the real GDP headline alone.',actions:['update','retain','retain']},
 {label:'Revise all three statements because their source page has been corrected.',actions:['update','update','update']},
 {label:'Keep all three statements because the GDP headline was not affected.',actions:['retain','retain','retain']}
 ],recruitment:'Take a 30-second reading comprehension test. Read one correction and answer one question. Participation is voluntary; we store an anonymous identifier and your first answer.',analysis:{primary:'proofpivot_revision_check_correct',guardrail:'proofpivot_revision_check_submitted',aggregation:'occurrence',allocation:[50,50],minimum_identities:50,minimum_conversions:5,operational_per_arm:65,target_per_arm:100,guardrail_material_loss_pp:5,interval_crosses_zero:'INCONCLUSIVE',integrity_failure:'DO_NOT_ACT'}};
deepFreeze(PROTOCOL);
export const protocolHash=hash(PROTOCOL);
export function score(option,payload){if(!Number.isInteger(option)||!PROTOCOL.options[option])throw Error('Complete answer required');const expected=payload.claims.map(c=>c.state==='changed'?'update':'retain');return PROTOCOL.options[option].actions.every((v,i)=>v===expected[i]);}
export function decision({integrity=false,identities=[],conversions=[],interval,guardrailHealthy=false}={}){
 if(!integrity)return 'DO_NOT_ACT';
 if(identities.length!==2||conversions.length!==2||identities.some(n=>n<50)||conversions.some(n=>n<5))return 'COLLECTING_DATA';
 if(!Array.isArray(interval)||interval.length!==2||interval.some(v=>!Number.isFinite(v))||interval[0]<=0&&interval[1]>=0)return 'INCONCLUSIVE';
 if(interval[1]<0)return 'RETAIN_CONTROL';
 return guardrailHealthy?'HUMAN_DECISION_REQUIRED':'DO_NOT_ACT';
}
