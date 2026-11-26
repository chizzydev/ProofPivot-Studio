import {ref} from './payload-core.mjs';
const expr=(op,a,b)=>({op,args:[ref(a),ref(b)]});
export const claims=[
 {id:'quarter-difference',label:'The quarter-to-quarter increase',subject:'Gross operating surplus of corporations, excluding alignment',sentence:'Between Q1 and Q2 2025, the published figure increased by £{value} million.',precision:0,expression:expr('difference','gos-Q2-2025','gos-Q1-2025')},
 {id:'annual-change',label:'The one-decimal annual comparison',subject:'The same Table 3 series',sentence:'In Q1 2026, the published figure was {value}% higher than a year earlier.',precision:1,expression:expr('percent_change','gos-Q1-2026','gos-Q1-2025')},
 {id:'headline-growth',label:'The separate GDP headline',subject:'UK real GDP, quarterly growth',sentence:'UK real GDP grew by {value}% in Q1 2026.',precision:1,expression:ref('real-gdp-q1-2026')}
];
export const onsRevision=(original,revised)=>({schema:1,witness:'ONS GDP-D3',historical_replay:true,original,revised,claims});
