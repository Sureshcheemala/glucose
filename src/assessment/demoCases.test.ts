import {describe,expect,it} from 'vitest';
import {words} from '../localization/words';
import {DIETARY_QUESTIONS,DIETARY_QUESTIONNAIRE_VERSION} from '../dietary/content';
import {DIETARY_RECOMMENDATION_RULES_VERSION,generateDietaryRecommendations,questionsForParticipantStatus,validateDietaryAnswers} from '../dietary/engine';
import {calculateIDRS} from '../idrs/scoring';
import {DEMO_CASES,IDRS_DEMO_CASES,buildDemoAssessment,demoCleanupTargets} from './demoCases';

describe('synthetic unified demo cases',()=>{
 it('preserves the original low, moderate and high standalone IDRS demonstrations',()=>{
  const results=IDRS_DEMO_CASES.map(item=>calculateIDRS(item.answers));
  expect(results.map(result=>[result.total,result.risk])).toEqual([[0,'low'],[40,'moderate'],[100,'high']]);
 });
 it('covers the three status paths, complete and partial sessions, and optional metric combinations',()=>{
  expect(DEMO_CASES.map(item=>item.id)).toEqual(['not-diagnosed-complete','diagnosed-complete-metrics','unknown-diet-only','idrs-only-pending','diagnosed-metrics-omitted','diagnosed-partial-metrics']);
  const built=DEMO_CASES.map(item=>({definition:item,seed:buildDemoAssessment(item,'en',new Date('2026-11-06T12:00:00.000Z'))}));
  const notDiagnosed=built[0].seed,diagnosed=built[1].seed,unknown=built[2].seed,idrsOnly=built[3].seed,noMetrics=built[4].seed,partialMetrics=built[5].seed;
  expect(notDiagnosed.session.participantStatus).toBe('not-diagnosed');expect(notDiagnosed.idrs).toBeDefined();expect(notDiagnosed.dietary).toBeDefined();expect(notDiagnosed.metrics).toBeUndefined();
  expect(diagnosed.session.participantStatus).toBe('diagnosed');expect(diagnosed.idrs).toBeDefined();expect(diagnosed.dietary).toBeDefined();expect(diagnosed.metrics).toMatchObject({hba1c:{value:7.2,unit:'%'},fastingGlucose:{value:132,unit:'mg/dL'}});
  expect(unknown.session.participantStatus).toBe('unknown');expect(unknown.idrs).toBeUndefined();expect(unknown.dietary).toBeDefined();expect(unknown.metrics).toBeUndefined();
  expect(idrsOnly.idrs).toBeDefined();expect(idrsOnly.dietary).toBeUndefined();
  expect(noMetrics.dietary).toBeDefined();expect(noMetrics.metrics).toBeUndefined();
  expect(partialMetrics.metrics?.hba1c?.value).toBe(6.8);expect(partialMetrics.metrics?.fastingGlucose).toBeUndefined();expect(partialMetrics.metrics?.postMealGlucose).toBeUndefined();
  expect(notDiagnosed.session.completionStatus).toBe('completed');expect(diagnosed.session.completionStatus).toBe('completed');expect(noMetrics.session.completionStatus).toBe('in-progress');expect(idrsOnly.session.completionStatus).toBe('in-progress');
 });
 it('uses current bilingual question IDs, answer choices, recommendation rules and versions',()=>{
  for(const definition of DEMO_CASES){
   const seed=buildDemoAssessment(definition,'te',new Date('2026-11-06T12:00:00.000Z'));
   expect(seed.session.isDemo).toBe(true);expect(seed.session.demoScenarioId).toBe(definition.id);
   if(seed.dietary){const questions=questionsForParticipantStatus(definition.participantStatus);expect(seed.dietary.questionnaireVersion).toBe(DIETARY_QUESTIONNAIRE_VERSION);expect(seed.dietary.recommendationRulesVersion).toBe(DIETARY_RECOMMENDATION_RULES_VERSION);expect(seed.dietary.language).toBe('te');expect(validateDietaryAnswers(seed.dietary.answers,questions)).toEqual([]);expect(Object.entries(seed.dietary.answers).every(([id,value])=>questions.some(question=>question.id===id&&question.options.some(option=>option.id===value)))).toBe(true);expect(seed.dietary.recommendations.map(item=>item.id)).toEqual(generateDietaryRecommendations(seed.dietary.answers,definition.participantStatus).map(item=>item.id));}
   if(seed.idrs){const reference=calculateIDRS(definition.idrsAnswers!);expect(seed.idrs.result.answers).toEqual(reference.answers);expect(seed.idrs.result.total).toBe(reference.total);expect(seed.idrs.result.risk).toBe(reference.risk);expect(seed.idrs.recommendations.contentVersion).toBeDefined();}
   if(seed.metrics){expect(seed.metrics.sessionId).toBe(seed.session.id);expect(seed.metrics.reviewStatus).toBe('pending_review');expect(seed.metrics.language).toBe('te');}
  }
  expect(DIETARY_QUESTIONS.every(question=>question.reviewStatus==='pending_review')).toBe(true);
 });
 it('keeps demo cleanup targets limited to flagged synthetic sessions and their linked IDs',()=>{
  const demo=buildDemoAssessment(DEMO_CASES[1],'en').session;demo.idrsSnapshots=[{legacyId:11,result:{answers:DEMO_CASES[1].idrsAnswers!,total:80,risk:'high',factors:[],date:demo.createdAt}}];demo.dietarySnapshots=[{legacyId:12,snapshot:{date:demo.createdAt,answers:{},language:'en',contentVersion:'demo',reviewStatus:'pending_review',recommendations:[]}}];demo.diabetesMetricsSnapshots=[{legacyId:13,snapshot:{sessionId:demo.id,recordedAt:demo.createdAt,language:'en',reviewStatus:'pending_review',sourceReferences:[]}}];
  const real={...structuredClone(demo),id:'real-session',isDemo:undefined,demoScenarioId:undefined};
  const unmarked={...structuredClone(demo),id:'unmarked-session',isDemo:false};
  expect(demoCleanupTargets([real,unmarked,demo])).toEqual([{id:demo.id,idrsIds:[11],dietaryIds:[12],metricIds:[13]}]);
  expect([real,unmarked].every(session=>!demoCleanupTargets([session]).length)).toBe(true);
 });
 it('localizes every new scenario label and action in English and Telugu',()=>{
  for(const item of DEMO_CASES){expect(words.en[item.titleKey as keyof typeof words.en]).toBeTruthy();expect(words.te[item.titleKey as keyof typeof words.te]).toBeTruthy();expect(words.en[item.descriptionKey as keyof typeof words.en]).toBeTruthy();expect(words.te[item.descriptionKey as keyof typeof words.te]).toBeTruthy();}
  for(const key of ['demoUnifiedTitle','demoUnifiedIntro','createDemo','resetDemos','confirmResetDemos','demoRecordLabel'] as const){expect(words.en[key].trim()).toBeTruthy();expect(words.te[key].trim()).toBeTruthy();}
 });
});
