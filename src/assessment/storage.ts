import {openDB,type DBSchema} from 'idb';
import {createHistoryRecord,listHistory,type Saved} from '../history/db';
import type {Result} from '../idrs/scoring';
import type {RecommendationSnapshot} from '../recommendations/engine';
import {listDietarySnapshots} from '../dietary/storage';
import type {AssessmentSession,DiabetesMetricsSessionSnapshot,DietarySessionSnapshot,IDRSSessionSnapshot,ParticipantStatus,UnifiedHistoryEntry} from './model';
import {buildCombinedSummary} from './combined';
import {ASSESSMENT_DB_VERSION,upgradeAssessmentDatabase} from './schema';
import {demoCleanupTargets} from './demoCases';

interface AssessmentDB extends DBSchema{screenings:{key:number;value:Saved};'dietary-assessments':{key:number;value:import('../dietary/model').DietarySnapshot&{id?:number};indexes:{'by-date':string}};'assessment-sessions':{key:string;value:AssessmentSession;indexes:{'by-date':string}};'diabetes-metrics':{key:number;value:import('../dietary/model').DiabetesMetricsSnapshot&{id?:number};indexes:{'by-session':string}}}
const DB='glucoguide-local';
async function db(){return openDB<AssessmentDB>(DB,ASSESSMENT_DB_VERSION,{upgrade(database,oldVersion){upgradeAssessmentDatabase(database,oldVersion)}})}
const newId=()=>globalThis.crypto?.randomUUID?.()??`session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export async function createAssessmentSession(participantStatus:ParticipantStatus):Promise<AssessmentSession>{const now=new Date().toISOString();const session:AssessmentSession={id:newId(),createdAt:now,updatedAt:now,participantStatus,idrsSnapshots:[],dietarySnapshots:[],completionStatus:'in-progress'};await(await db()).add('assessment-sessions',session);return session}
export async function getAssessmentSession(id:string){return(await db()).get('assessment-sessions',id)}
/** Saves and links an IDRS result in one transaction. A retry for the same result is idempotent. */
export async function saveIDRSResultToSession(id:string,result:Result,recommendations:RecommendationSnapshot):Promise<number>{
 const database=await db();const tx=database.transaction(['screenings','assessment-sessions'],'readwrite');
 const sessions=tx.objectStore('assessment-sessions');const session=await sessions.get(id);
 if(!session){await tx.done;throw new Error('Assessment session was not found.');}
 const signature=JSON.stringify(result.answers);
 const existing=session.idrsSnapshots.find(item=>item.result.date===result.date&&JSON.stringify(item.result.answers)===signature);
 if(existing){await tx.done;return existing.legacyId;}
 const screenings=tx.objectStore('screenings');
 const base=createHistoryRecord(result,recommendations);const key=await screenings.add(base);const numericId=Number(key);
 const record:Saved={...base,id:numericId,recommendationSnapshot:{...structuredClone(recommendations),screeningId:numericId}};
 await screenings.put(record);
 const item:IDRSSessionSnapshot={legacyId:numericId,result:structuredClone(record),recommendations:structuredClone(record.recommendationSnapshot)};
 session.idrsSnapshots=[...session.idrsSnapshots.filter(snapshot=>snapshot.legacyId!==numericId),item];session.idrsDraft=undefined;
 const lang=session.dietarySnapshots.at(-1)?.snapshot.language??record.recommendationSnapshot?.language??'en';const summary=buildCombinedSummary(session,lang);if(summary)session.combinedSummary=summary;
 session.updatedAt=new Date().toISOString();await sessions.put(session);await tx.done;return numericId;
}
/** Saves and links one dietary result atomically, with retry deduplication by captured result. */
export async function saveDietaryResultToSession(id:string,snapshot:import('../dietary/model').DietarySnapshot,metrics?:import('../dietary/model').DiabetesMetricsSnapshot):Promise<number>{
 const database=await db();const tx=database.transaction(['dietary-assessments','assessment-sessions','diabetes-metrics'],'readwrite');const sessions=tx.objectStore('assessment-sessions');const session=await sessions.get(id);
 if(!session){await tx.done;throw new Error('Assessment session was not found.')}
 const signature=JSON.stringify(snapshot.answers);const existing=session.dietarySnapshots.find(item=>item.snapshot.date===snapshot.date&&JSON.stringify(item.snapshot.answers)===signature);let numericId:number;
 if(existing)numericId=existing.legacyId;
 else{const dietary=tx.objectStore('dietary-assessments');const value=structuredClone(snapshot);delete value.assessmentId;const key=await dietary.add(value);numericId=Number(key);const saved={...value,assessmentId:numericId,id:numericId};await dietary.put(saved);const item:DietarySessionSnapshot={legacyId:numericId,snapshot:structuredClone(saved)};session.dietarySnapshots=[...session.dietarySnapshots.filter(entry=>entry.legacyId!==numericId),item];session.dietaryDraft=undefined;}
 if(metrics){
  const metricsStore=tx.objectStore('diabetes-metrics');const metricsSignature=JSON.stringify({...metrics,id:undefined});
  const existingMetrics=(await metricsStore.index('by-session').getAll(id)).find(item=>JSON.stringify({...item,id:undefined})===metricsSignature);
  if(!existingMetrics){const metricsValue=structuredClone(metrics);const metricsId=Number(await metricsStore.add(metricsValue));const savedMetrics={...metricsValue,id:metricsId};const metricSnapshot:DiabetesMetricsSessionSnapshot={legacyId:metricsId,snapshot:structuredClone(savedMetrics)};session.diabetesMetricsSnapshots=[...(session.diabetesMetricsSnapshots??[]).filter(item=>item.legacyId!==metricsId),metricSnapshot];}
 }
 const summary=buildCombinedSummary(session,snapshot.language);if(summary)session.combinedSummary=summary;session.updatedAt=new Date().toISOString();await sessions.put(session);await tx.done;return numericId;
}
/** Saves a stand-alone dietary result as a new unified session when optional metrics are present. */
export async function saveStandaloneDietaryResult(snapshot:import('../dietary/model').DietarySnapshot,status:ParticipantStatus,metrics:import('../dietary/model').DiabetesMetricsSnapshot){
 const database=await db();const tx=database.transaction(['dietary-assessments','assessment-sessions','diabetes-metrics'],'readwrite');const now=new Date().toISOString();const id=newId();
 const session:AssessmentSession={id,createdAt:now,updatedAt:now,participantStatus:status,idrsSnapshots:[],dietarySnapshots:[],diabetesMetricsSnapshots:[],completionStatus:'in-progress'};
 const dietaryValue=structuredClone(snapshot);delete dietaryValue.assessmentId;const dietaryId=Number(await tx.objectStore('dietary-assessments').add(dietaryValue));const dietarySaved={...dietaryValue,assessmentId:dietaryId,id:dietaryId};session.dietarySnapshots=[{legacyId:dietaryId,snapshot:structuredClone(dietarySaved)}];
 const metricValue={...structuredClone(metrics),sessionId:id};const metricId=Number(await tx.objectStore('diabetes-metrics').add(metricValue));session.diabetesMetricsSnapshots=[{legacyId:metricId,snapshot:{...metricValue,id:metricId}}];
 const summary=buildCombinedSummary(session,snapshot.language);if(summary)session.combinedSummary=summary;await tx.objectStore('assessment-sessions').add(session);await tx.done;return {sessionId:id,dietaryId};
}
export async function listAssessmentSessions(){return(await db()).getAllFromIndex('assessment-sessions','by-date').then(items=>items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))}
export async function putAssessmentSession(session:AssessmentSession,rebuildSummary=false){const next={...structuredClone(session),updatedAt:new Date().toISOString()};if(rebuildSummary){const language=next.dietarySnapshots.at(-1)?.snapshot.language??next.idrsSnapshots.at(-1)?.recommendations?.language??'en';const summary=buildCombinedSummary(next,language);if(summary)next.combinedSummary=summary;}await(await db()).put('assessment-sessions',next);return next}
export async function attachIDRSSnapshot(id:string,record:Saved&{id:number}){const database=await db();const tx=database.transaction(['screenings','assessment-sessions'],'readwrite');const session=await tx.objectStore('assessment-sessions').get(id);const stored=await tx.objectStore('screenings').get(record.id);if(!session||!stored){await tx.done;throw new Error(!session?'Assessment session was not found.':'Saved IDRS result was not found.')}const item:IDRSSessionSnapshot={legacyId:record.id,result:structuredClone(stored),recommendations:stored.recommendationSnapshot?structuredClone(stored.recommendationSnapshot):undefined};session.idrsSnapshots=[...session.idrsSnapshots.filter(s=>s.legacyId!==record.id),item];session.idrsDraft=undefined;session.updatedAt=new Date().toISOString();const lang=session.dietarySnapshots.at(-1)?.snapshot.language??item.recommendations?.language??'en';const summary=buildCombinedSummary(session,lang);if(summary)session.combinedSummary=summary;await tx.objectStore('assessment-sessions').put(session);await tx.done}
export async function attachDietarySnapshot(id:string,record:(Awaited<ReturnType<typeof listDietarySnapshots>>)[number]){const session=await getAssessmentSession(id);if(!session)throw new Error('Assessment session was not found.');const item:DietarySessionSnapshot={legacyId:record.id,snapshot:structuredClone(record)};session.dietarySnapshots=[...session.dietarySnapshots.filter(s=>s.legacyId!==record.id),item];session.dietaryDraft=undefined;await putAssessmentSession(session,true)}
export async function saveIDRSDraft(id:string,draft:AssessmentSession['idrsDraft']){const session=await getAssessmentSession(id);if(!session)throw new Error('Assessment session was not found.');session.idrsDraft=structuredClone(draft);await putAssessmentSession(session)}
export async function saveDietaryDraft(id:string,draft:NonNullable<AssessmentSession['dietaryDraft']>){const session=await getAssessmentSession(id);if(session){session.dietaryDraft=structuredClone(draft);await putAssessmentSession(session)}}
export function canCompleteAssessmentSession(session:Pick<AssessmentSession,'idrsSnapshots'|'dietarySnapshots'>){return session.idrsSnapshots.length>0&&session.dietarySnapshots.length>0}
export async function finishAssessmentSession(id:string){const session=await getAssessmentSession(id);if(!session||!canCompleteAssessmentSession(session))return false;session.completionStatus='completed';await putAssessmentSession(session);return true}
export async function clearAssessmentSessions(){const database=await db();const tx=database.transaction(['assessment-sessions','diabetes-metrics'],'readwrite');await Promise.all([tx.objectStore('assessment-sessions').clear(),tx.objectStore('diabetes-metrics').clear()]);await tx.done}
/** Persists one user-selected synthetic scenario atomically; never overwrites existing records. */
export async function saveDemoAssessmentSession(input:{session:AssessmentSession;idrs?:{result:Result;recommendations:RecommendationSnapshot};dietary?:import('../dietary/model').DietarySnapshot;metrics?:import('../dietary/model').DiabetesMetricsSnapshot}):Promise<AssessmentSession>{
 const database=await db();const tx=database.transaction(['screenings','dietary-assessments','assessment-sessions','diabetes-metrics'],'readwrite');const session=structuredClone(input.session);
 if(!session.isDemo||!session.demoScenarioId)throw new Error('Synthetic demo marker is required.');
 if(input.idrs){const base=createHistoryRecord(input.idrs.result,input.idrs.recommendations);const id=Number(await tx.objectStore('screenings').add(base));const result:Saved={...base,id,recommendationSnapshot:{...structuredClone(input.idrs.recommendations),screeningId:id}};await tx.objectStore('screenings').put(result);session.idrsSnapshots=[{legacyId:id,result,recommendations:structuredClone(result.recommendationSnapshot)}]}
 if(input.dietary){const snapshot=structuredClone(input.dietary);delete snapshot.assessmentId;const id=Number(await tx.objectStore('dietary-assessments').add(snapshot));const saved={...snapshot,assessmentId:id,id};session.dietarySnapshots=[{legacyId:id,snapshot:saved}]}
 if(input.metrics){const metric={...structuredClone(input.metrics),sessionId:session.id};const id=Number(await tx.objectStore('diabetes-metrics').add(metric));session.diabetesMetricsSnapshots=[{legacyId:id,snapshot:{...metric,id}}]}
 const summary=buildCombinedSummary(session,input.dietary?.language??input.idrs?.recommendations.language??'en');if(summary)session.combinedSummary=summary;
 session.completionStatus=session.idrsSnapshots.length>0&&session.dietarySnapshots.length>0?'completed':'in-progress';
 await tx.objectStore('assessment-sessions').add(session);await tx.done;return session;
}
/** Demo cleanup is explicitly scoped to marked synthetic sessions and their linked records. */
export async function deleteDemoAssessmentSessions():Promise<number>{
 const database=await db();const tx=database.transaction(['screenings','dietary-assessments','assessment-sessions','diabetes-metrics'],'readwrite');const sessions=await tx.objectStore('assessment-sessions').getAll();const demos=demoCleanupTargets(sessions);
 await Promise.all(demos.flatMap(session=>[
  tx.objectStore('assessment-sessions').delete(session.id),
  ...session.idrsIds.map(id=>tx.objectStore('screenings').delete(id)),
  ...session.dietaryIds.map(id=>tx.objectStore('dietary-assessments').delete(id)),
  ...session.metricIds.map(id=>tx.objectStore('diabetes-metrics').delete(id)),
 ]));await tx.done;return demos.length;
}
export async function removeUnifiedHistoryEntry(entry:UnifiedHistoryEntry){
 const database=await db();
 if(entry.kind==='legacy-idrs')return database.delete('screenings',entry.record.legacyId);
 if(entry.kind==='legacy-dietary')return database.delete('dietary-assessments',entry.record.legacyId);
 const transaction=database.transaction(['screenings','dietary-assessments','assessment-sessions','diabetes-metrics'],'readwrite');
 await Promise.all([transaction.objectStore('assessment-sessions').delete(entry.session.id),...entry.session.idrsSnapshots.map(item=>transaction.objectStore('screenings').delete(item.legacyId)),...entry.session.dietarySnapshots.map(item=>transaction.objectStore('dietary-assessments').delete(item.legacyId)),...(entry.session.diabetesMetricsSnapshots??[]).map(item=>transaction.objectStore('diabetes-metrics').delete(item.legacyId))]);
 await transaction.done;
}
/** Unpaired legacy rows remain visible as standalone entries; linked rows appear only in their session. */
export function composeUnifiedHistory(sessions:AssessmentSession[],idrs:Saved[],dietary:(Awaited<ReturnType<typeof listDietarySnapshots>>)){ 
 const linkedIDRS=new Set(sessions.flatMap(s=>s.idrsSnapshots.map(item=>item.legacyId)));const linkedDietary=new Set(sessions.flatMap(s=>s.dietarySnapshots.map(item=>item.legacyId)));
 const entries:UnifiedHistoryEntry[]=[...sessions.map(session=>({kind:'session' as const,session})),...idrs.filter(record=>record.id!==undefined&&!linkedIDRS.has(record.id)).map(record=>({kind:'legacy-idrs' as const,id:`legacy-idrs-${record.id}`,record:{legacyId:record.id!,result:record,recommendations:record.recommendationSnapshot},date:record.date})),...dietary.filter(record=>!linkedDietary.has(record.id)).map(record=>({kind:'legacy-dietary' as const,id:`legacy-dietary-${record.id}`,record:{legacyId:record.id,snapshot:record},date:record.date}))];
 return entries.sort((a,b)=>(b.kind==='session'?b.session.updatedAt:b.date).localeCompare(a.kind==='session'?a.session.updatedAt:a.date));
}
export async function listUnifiedHistory():Promise<UnifiedHistoryEntry[]>{const [sessions,idrs,dietary]=await Promise.all([listAssessmentSessions(),listHistory(),listDietarySnapshots()]);return composeUnifiedHistory(sessions,idrs,dietary)}
