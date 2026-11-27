import{createHash}from'node:crypto';
export function draw(seed,index,purpose){return createHash('sha256').update(`${seed}:${index}:${purpose}`).digest().readUInt32BE(0)/4294967296;}
export function behavior(model,index,variant,key,optionCount){
 if(!Number.isInteger(index)||index<0||index>=model.attempted_sessions||!Object.hasOwn(model.correctness_probability,variant)||!Number.isInteger(key)||key<0||key>=optionCount)throw Error('Frozen simulation input required');
 const complete=draw(model.seed,index,'completion')<model.completion_probability[variant];
 const intended_correct=draw(model.seed,index,'correctness')<model.correctness_probability[variant];
 const wrong=Array.from({length:optionCount},(_,i)=>i).filter(i=>i!==key);
 return{complete,intended_correct,option:intended_correct?key:wrong[Math.floor(draw(model.seed,index,'wrong-option')*wrong.length)]};
}
