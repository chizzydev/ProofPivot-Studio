import{createHmac}from'node:crypto';
export function simulationIdentity(run,secret,index){
 if(run.role!=='hackathon_simulation'||run.environment!=='Simulation'||!secret||!Number.isInteger(index)||index<0||index>=run.expected_sessions)throw Error('Frozen scripted session index required');
 const h=createHmac('sha256',secret).update(`${run.run}:${run.model_hash}:${index}`).digest('hex').slice(0,32);
 return'pp:'+`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
