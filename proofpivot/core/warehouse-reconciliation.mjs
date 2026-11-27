// Flagsmith counts distinct EVENT NAMES in unique_events_count, not event rows.
// Source: flagsmith/flagsmith f4de7145, experimentation/warehouses/queries.py.
export function reconcileWarehouse(ledger,warehouse,eventNames,{baselineRows=1,baselineNames=['proofpivot_infrastructure_canary']}={}){
 const rows=ledger.outbox.reduce((n,o)=>n+o.count,0),expectedRows=rows+baselineRows;
 const expectedNames=[...new Set([...baselineNames,...ledger.outbox.filter(o=>o.count>0).map(o=>o.event)])].sort();
 const observedNames=[...new Set(eventNames?.events||[])].sort();
 const unresolved=ledger.outbox.filter(o=>o.status!=='HTTP_ACCEPTED').reduce((n,o)=>n+o.count,0);
 const rowCountMatches=warehouse.total_events_received===expectedRows;
 const vocabularyMatches=eventNames?.is_truncated===false&&JSON.stringify(expectedNames)===JSON.stringify(observedNames)&&warehouse.unique_events_count===observedNames.length;
 return{reconciled:warehouse.status==='connected'&&rowCountMatches&&vocabularyMatches&&unresolved===0,expected_rows:expectedRows,observed_rows:warehouse.total_events_received,expected_event_names:expectedNames,observed_event_names:observedNames,distinct_event_name_count:warehouse.unique_events_count,row_count_matches:rowCountMatches,event_vocabulary_matches:vocabularyMatches,unresolved,scope:'Aggregate transport and event-vocabulary checks, not row-level event-ID equality or an exactly-once guarantee.'};
}
