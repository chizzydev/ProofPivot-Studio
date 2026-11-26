import {hash,deepFreeze} from './payload.mjs';
export const PROTOCOL={version:'ons-comprehension-v1-draft',status:'DEVELOPMENT_ONLY',exposure_dwell_ms:2000,response_window_ms:180000,question:'You are updating this article today. Which set of figures belongs in it?',order:['Q1 to Q2 increase (£ million)','Annual comparison (one decimal)','Real GDP quarterly growth'],options:[['3287','4.5','0.6'],['3240','4.5','0.6'],['3240','4.6','0.6'],['3240','4.5','1.1']],recruitment:'Take a 30-second reading comprehension test. Read one correction and answer one question. Participation is voluntary; we store an anonymous identifier and your first answer.',analysis:{primary:'proofpivot_revision_check_correct',guardrail:'proofpivot_revision_check_submitted',aggregation:'occurrence',allocation:[50,50],minimum_identities:50,minimum_conversions:5,operational_per_arm:65,target_per_arm:100,guardrail_material_loss_pp:5,interval_crosses_zero:'INCONCLUSIVE',integrity_failure:'DO_NOT_ACT'}};
deepFreeze(PROTOCOL);
export const protocolHash=hash(PROTOCOL);
export function score(option,payload){if(!Number.isInteger(option)||!PROTOCOL.options[option])throw Error('Complete answer required');const expected=payload.claims.map(c=>c.current_display);return PROTOCOL.options[option].every((v,i)=>v===expected[i]);}
export function decision({integrity=false,identities=[],conversions=[],interval,guardrailHealthy=false}={}){
 if(!integrity)return 'DO_NOT_ACT';
 if(identities.length!==2||conversions.length!==2||identities.some(n=>n<50)||conversions.some(n=>n<5))return 'COLLECTING_DATA';
 if(!Array.isArray(interval)||interval.length!==2||interval.some(v=>!Number.isFinite(v))||interval[0]<=0&&interval[1]>=0)return 'INCONCLUSIVE';
 if(interval[1]<0)return 'RETAIN_CONTROL';
 return guardrailHealthy?'HUMAN_DECISION_REQUIRED':'DO_NOT_ACT';
}
