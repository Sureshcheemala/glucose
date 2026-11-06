import {beforeEach,describe,expect,it,vi} from 'vitest';
import {calculateIDRS} from '../idrs/scoring';
import {createRecommendationSnapshot} from '../recommendations/engine';
import type {AssessmentSession} from './model';
import {createPreviewSession,attachPreviewIDRS,attachPreviewDietary} from './previewSession';

const memory=vi.hoisted(()=>({
 rows:{screenings:[] as Record<string,unknown>[], 'dietary-assessments':[] as Record<string,unknown>[], 'assessment-sessions':[] as Record<string,unknown>[], 'diabetes-metrics':[] as Record<string,unknown>[]},
 next:{screenings:0,'dietary-assessments':0,'assessment-sessions':0,'diabetes-metrics':0},
 failOnStore:''
}));
vi.mock('idb',()=>({openDB:async()=>({transaction:()=>{
 const staged=structuredClone(memory.rows);const next={...memory.next};
 const transaction={objectStore:(name:keyof typeof memory.rows)=>({get:async(key:string|number)=>staged[name].find(row=>row.id===key),add:async(value:Record<string,unknown>)=>{
  if(memory.failOnStore===name)throw new Error(`synthetic failure: ${name}`);
  const id=name==='assessment-sessions'?String(value.id):++next[name];const stored={...structuredClone(value),id};staged[name].push(stored);return id;
 },put:async(value:Record<string,unknown>)=>{const index=staged[name].findIndex(row=>row.id===value.id);if(index<0)staged[name].push(structuredClone(value));else staged[name][index]=structuredClone(value);return value.id}}),get done(){memory.rows=staged;memory.next=next;return Promise.resolve()}};
 return transaction;
}})}));
import {savePreviewAssessmentSession} from './storage';

const result=calculateIDRS({age:42,sex:'male',waist:94,activity:'moderate',parents:'neither'});
const recommendations=createRecommendationSnapshot(result,'en','2026-11-06T00:00:00.000Z');
const dietary={date:'2026-11-06T00:00:00.000Z',answers:{meals_pattern:'regular'},language:'en' as const,participantStatus:'diagnosed' as const,questionnaireVersion:'DHA-Q-2.0.0',recommendationRulesVersion:'DHA-R-2.0.0',contentVersion:'DHA-1.0.0',reviewStatus:'pending_review' as const,recommendations:[],sourceReferences:[]};
const metrics={sessionId:'unsaved-storage',recordedAt:'2026-11-06T00:00:00.000Z',language:'en' as const,reviewStatus:'pending_review' as const,hba1c:{value:7.1,unit:'%' as const,measuredAt:'2026-11-05'},sourceReferences:[]};
function completeSession():AssessmentSession{let session=createPreviewSession('diagnosed','unsaved-storage','2026-11-06T00:00:00.000Z');session=attachPreviewIDRS(session,result,recommendations);return attachPreviewDietary(session,dietary,metrics)}

describe('explicit unified session persistence',()=>{
 beforeEach(()=>{memory.rows={screenings:[], 'dietary-assessments':[], 'assessment-sessions':[], 'diabetes-metrics':[]};memory.next={screenings:0,'dietary-assessments':0,'assessment-sessions':0,'diabetes-metrics':0};memory.failOnStore=''});
 it('saves both completed modules and optional metrics in one session',async()=>{const saved=await savePreviewAssessmentSession(completeSession());expect(saved.completionStatus).toBe('completed');expect(saved.idrsSnapshots).toHaveLength(1);expect(saved.dietarySnapshots).toHaveLength(1);expect(saved.diabetesMetricsSnapshots).toHaveLength(1);expect(memory.rows['assessment-sessions']).toHaveLength(1);expect(memory.rows.screenings).toHaveLength(1);expect(memory.rows['dietary-assessments']).toHaveLength(1);expect(memory.rows['diabetes-metrics']).toHaveLength(1);expect(saved.idrsSnapshots[0].result.total).toBe(40);expect(saved.idrsSnapshots[0].recommendations?.language).toBe('en');expect(saved.dietarySnapshots[0].snapshot.questionnaireVersion).toBe('DHA-Q-2.0.0');expect(saved.combinedSummary?.availableModules).toEqual(['idrs','dietary'])});
 it('does not duplicate history rows when Save is retried with the same session ID',async()=>{const input=completeSession();const first=await savePreviewAssessmentSession(input);const second=await savePreviewAssessmentSession(input);expect(second.id).toBe(first.id);expect(memory.rows['assessment-sessions']).toHaveLength(1);expect(memory.rows.screenings).toHaveLength(1);expect(memory.rows['dietary-assessments']).toHaveLength(1);expect(memory.rows['diabetes-metrics']).toHaveLength(1)});
 it('leaves all stores unchanged and retains the in-memory session when any write fails',async()=>{const input=completeSession();memory.failOnStore='dietary-assessments';await expect(savePreviewAssessmentSession(input)).rejects.toThrow('synthetic failure');expect(memory.rows['assessment-sessions']).toHaveLength(0);expect(memory.rows.screenings).toHaveLength(0);expect(memory.rows['dietary-assessments']).toHaveLength(0);expect(memory.rows['diabetes-metrics']).toHaveLength(0);expect(input.idrsSnapshots[0].result.total).toBe(40);expect(input.dietarySnapshots[0].snapshot.answers).toEqual(dietary.answers)});
 it('saves a valid partial session as in progress instead of inventing the missing module',async()=>{let input=attachPreviewIDRS(createPreviewSession('unknown','unsaved-partial'),result,recommendations);const saved=await savePreviewAssessmentSession(input);expect(saved.completionStatus).toBe('in-progress');expect(saved.idrsSnapshots).toHaveLength(1);expect(saved.dietarySnapshots).toHaveLength(0);expect(memory.rows['dietary-assessments']).toHaveLength(0)});
 it('refuses to persist a session with no completed modules',async()=>{const empty=createPreviewSession('unknown','unsaved-empty');await expect(savePreviewAssessmentSession(empty)).rejects.toThrow('Complete at least one');expect(memory.rows['assessment-sessions']).toHaveLength(0)});
});
