import {buildRevisionPayload,lockPayloads} from './payload-core.mjs';
// A fresh immutable value per invocation. No experiment/provider imports or mutable session.
export async function runSandbox(input){
 const facts=buildRevisionPayload(input);
 const control={facts,renderer:'correction_note'},treatment={facts,renderer:'evidence_time_machine'};
 const correction_payload_hash=await lockPayloads(control.facts,treatment.facts);
 return Object.freeze({facts,correction_payload_hash,control:Object.freeze({...control,correction_payload_hash}),treatment:Object.freeze({...treatment,correction_payload_hash})});
}
