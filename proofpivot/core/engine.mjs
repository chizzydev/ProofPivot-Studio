// Exact rational arithmetic: decimal input, explicit half-away-from-zero display rounding.
export class Decimal {
 constructor(n,d=1n){this.n=BigInt(n);this.d=BigInt(d);if(!this.d)throw Error('Division by zero');if(this.d<0n){this.n=-this.n;this.d=-this.d;}}
 static of(v){if(v instanceof Decimal)return v;const s=String(v);if(!/^-?\d+(\.\d+)?$/.test(s))throw Error('Decimal string required');const [a,b='']=s.split('.');return new Decimal(BigInt(a+b),10n**BigInt(b.length));}
 add(v){v=Decimal.of(v);return new Decimal(this.n*v.d+v.n*this.d,this.d*v.d);}
 sub(v){v=Decimal.of(v);return new Decimal(this.n*v.d-v.n*this.d,this.d*v.d);}
 mul(v){v=Decimal.of(v);return new Decimal(this.n*v.n,this.d*v.d);}
 div(v){v=Decimal.of(v);return new Decimal(this.n*v.d,this.d*v.n);}
 eq(v){v=Decimal.of(v);return this.n*v.d===v.n*this.d;}
 format(places){if(!Number.isInteger(places)||places<0||places>12)throw Error('Invalid precision');const p=10n**BigInt(places),a=this.n<0n?-this.n:this.n;let q=(a*p)/this.d;if(((a*p)%this.d)*2n>=this.d)q++;const digits=q.toString().padStart(places+1,'0');return (this.n<0n&&q?'-':'')+(places?digits.slice(0,-places)+'.'+digits.slice(-places):digits);}
 exact(){return {numerator:this.n.toString(),denominator:this.d.toString()};}
}
export function dependencies(expr){if(expr.op==='observation')return [expr.ref];if(!Array.isArray(expr.args)||expr.args.length!==2)throw Error('Binary expression required');return [...new Set(expr.args.flatMap(dependencies))];}
export function evaluate(expr,observations){
 if(expr.op==='observation'){
  const o=observations[expr.ref];if(!o?.unit||!o?.basis)throw Error('Unknown measure semantics');
  return {value:Decimal.of(o.value),unit:o.unit,basis:o.basis};
 }
 const [a,b]=expr.args.map(e=>evaluate(e,observations));
 if(a.unit!==b.unit||a.basis!==b.basis)throw Error('Incompatible measure semantics');
 if(expr.op==='difference')return {...a,value:a.value.sub(b.value)};
 if(expr.op==='percent_change')return {value:a.value.sub(b.value).div(b.value).mul('100'),unit:'percent',basis:`percent change of ${a.basis}`};
 throw Error('Unsupported expression');
}
export function revise(claims,original,current){
 return claims.map(claim=>{
  const deps=dependencies(claim.expression),before=evaluate(claim.expression,original.observations);
  const after=claim.temporality==='historical'?before:evaluate(claim.expression,current.observations);
  const affected=deps.some(ref=>{
   const a=original.observations[ref],b=current.observations[ref];
   if(!a||!b)throw Error('Missing dependency');return !Decimal.of(a.value).eq(b.value)||a.unit!==b.unit||a.basis!==b.basis;
  });
  const oldDisplay=before.value.format(claim.precision),newDisplay=after.value.format(claim.precision);
  return {...claim,dependencies:deps,unit:after.unit,basis:after.basis,original_value:before.value.exact(),current_value:after.value.exact(),original_display:oldDisplay,current_display:newDisplay,state:claim.temporality==='historical'?'historical':!affected?'unaffected':oldDisplay===newDisplay?'precision_preserving':'changed',supported_release:claim.temporality==='historical'?original.id:current.id};
 });
}
