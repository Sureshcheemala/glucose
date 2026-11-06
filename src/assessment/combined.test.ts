import {describe,expect,it} from 'vitest';
import {buildCombinedSummary} from './combined';
import {canCompleteAssessmentSession,composeUnifiedHistory} from './storage';
import {questionsForParticipantStatus,generateDietaryRecommendations} from '../dietary/engine';
import type {AssessmentSession} from './model';
import {calculateIDRS} from '../idrs/scoring';
import {createRecommendationSnapshot} from '../recommendations/engine';

const idrs={legacyId:1,result:{date:'2026-01-01',total:50,risk:'moderate' as const,answers:{age:50,sex:'female' as const,waist:90,activity:'sedentary' as const,parents:'both' as const},factors:[{key:'age' as const,score:30,max:30},{key:'waist' as const,score:20,max:20},{key:'activity' as const,score:30,max:30},{key:'parents' as const,score:20,max:20}]}};
const dietary={legacyId:2,snapshot:{date:'2026-01-02',language:'en' as const,participantStatus:'not-diagnosed' as const,contentVersion:'DHA-1.0.0',reviewStatus:'pending_review' as const,answers:{sweet_drinks:'daily'},recommendations:[],sourceReferences:[]}};
const blank=(participantStatus:AssessmentSession['participantStatus']):AssessmentSession=>({id:'s',createdAt:'2026-01-01',updatedAt:'2026-01-01',participantStatus,idrsSnapshots:[],dietarySnapshots:[],completionStatus:'in-progress'});

describe('participant-specific dietary flow',()=>{
 it.each(['not-diagnosed','diagnosed','unknown'] as const)('uses the same shortened core questions for %s',status=>{const questions=questionsForParticipantStatus(status);expect(questions.filter(q=>!q.visibility)).toHaveLength(12);expect(questions.some(q=>q.id==='medical_food_guidance')).toBe(true);expect(questions.every(q=>q.reviewStatus==='pending_review')).toBe(true);expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length)});
 it('adds only the optional diagnosed follow-up to the shared core',()=>{expect(questionsForParticipantStatus('not-diagnosed')).toHaveLength(12);expect(questionsForParticipantStatus('unknown')).toHaveLength(12);expect(questionsForParticipantStatus('diagnosed')).toHaveLength(13);expect(questionsForParticipantStatus('diagnosed').find(q=>q.id==='diet_guidance_difficulty')?.optional).toBe(true)});
 it('keeps the professional eating-plan prompt shared and the difficulty follow-up diagnosed-only',()=>{for(const status of ['not-diagnosed','diagnosed','unknown'] as const){const ids=questionsForParticipantStatus(status).map(q=>q.id);expect(ids).toContain('medical_food_guidance');expect(ids.includes('diet_guidance_difficulty')).toBe(status==='diagnosed')}});
 it('adds education only when shared or diagnosed-specific answers support it',()=>{const answers={sweet_drinks_frequency:'daily',diet_guidance_difficulty:'yes'};expect(generateDietaryRecommendations(answers,'not-diagnosed').map(r=>r.id)).toContain('sweet-drinks-often');expect(generateDietaryRecommendations(answers,'diagnosed').map(r=>r.id)).toContain('discuss-food-guidance');expect(generateDietaryRecommendations(answers,'unknown').map(r=>r.id)).not.toContain('discuss-food-guidance')});
 it('does not infer a beverage answer from diagnosis status or a hidden follow-up',()=>{expect(generateDietaryRecommendations({diet_guidance_difficulty:'yes'},'diagnosed').map(r=>r.id)).not.toContain('sweet-drinks-often');expect(generateDietaryRecommendations({diet_guidance_difficulty:'yes'},'unknown').map(r=>r.id)).not.toContain('discuss-food-guidance')});
});
describe('combined summary',()=>{
 it('supports partial IDRS-only sessions without a combined score',()=>{const summary=buildCombinedSummary({...blank('unknown'),idrsSnapshots:[idrs]},'en','2026-01-03');expect(summary?.availableModules).toEqual(['idrs']);expect(summary).not.toHaveProperty('score');expect(summary?.observations).toEqual([])});
 it('does not infer a cross-module relationship before a reviewed rule exists',()=>{const session={...blank('not-diagnosed'),idrsSnapshots:[idrs],dietarySnapshots:[dietary]};const original=structuredClone(session);const summary=buildCombinedSummary(session,'en','2026-01-03');expect(summary?.availableModules).toEqual(['idrs','dietary']);expect(summary?.observations[0].en).toContain('no cross-module relationship or cause is inferred');expect(summary?.observations[0].sourceModules).toEqual(['idrs','dietary']);expect(summary?.observations[0].reviewStatus).toBe('pending_review');expect(summary).not.toHaveProperty('probability');expect(session).toEqual(original)});
 it('supports dietary-only sessions and preserves status',()=>{const summary=buildCombinedSummary({...blank('diagnosed'),dietarySnapshots:[dietary]},'te','2026-01-03');expect(summary?.availableModules).toEqual(['dietary']);expect(summary?.language).toBe('te')});
 it('does not let dietary answers change IDRS score',()=>{const answers={age:48,sex:'female' as const,waist:87,activity:'mild' as const,parents:'one' as const};const before=calculateIDRS(answers);generateDietaryRecommendations({sweet_drinks:'daily',prevention_interest:'sugary_drinks'},'not-diagnosed');const after=calculateIDRS(answers);expect(after.total).toBe(before.total);expect(after.factors).toEqual(before.factors)});
 it('keeps original result and recommendation snapshots unchanged when building a summary',()=>{const recommendations=createRecommendationSnapshot(idrs.result,'te','2026-01-01T00:00:00.000Z',1);const session={...blank('not-diagnosed'),idrsSnapshots:[{...idrs,recommendations}],dietarySnapshots:[dietary]};const before=structuredClone(session);buildCombinedSummary(session,'en','2026-02-01T00:00:00.000Z');expect(session).toEqual(before);expect(session.idrsSnapshots[0].recommendations?.language).toBe('te');expect(session.idrsSnapshots[0].recommendations?.screeningDate).toBe('2026-01-01');expect(session.dietarySnapshots[0].snapshot.contentVersion).toBe('DHA-1.0.0');expect(session.dietarySnapshots[0].snapshot.language).toBe('en')});
});
describe('session completion requirements',()=>{
 it('requires both independent module snapshots before marking a session complete',()=>{
  expect(canCompleteAssessmentSession(blank('unknown'))).toBe(false);
  expect(canCompleteAssessmentSession({...blank('unknown'),idrsSnapshots:[idrs]})).toBe(false);
  expect(canCompleteAssessmentSession({...blank('unknown'),dietarySnapshots:[dietary]})).toBe(false);
  expect(canCompleteAssessmentSession({...blank('unknown'),idrsSnapshots:[idrs],dietarySnapshots:[dietary]})).toBe(true);
 });
});
describe('unified history compatibility',()=>{
 it('links known records once and leaves unpaired legacy rows independently accessible',()=>{
  const linked={...idrs,legacyId:1};const session={...blank('unknown'),idrsSnapshots:[linked],dietarySnapshots:[dietary]};
  const idrsRows=[{...idrs.result,id:1},{...idrs.result,id:9}];const dietaryRows=[{...dietary.snapshot,id:2},{...dietary.snapshot,id:10}];
  const rows=composeUnifiedHistory([session],idrsRows,dietaryRows);
  expect(rows.map(row=>row.kind).sort()).toEqual(['legacy-dietary','legacy-idrs','session']);
  expect(rows.some(row=>row.kind==='legacy-idrs'&&row.record.legacyId===1)).toBe(false);
  expect(rows.some(row=>row.kind==='legacy-dietary'&&row.record.legacyId===2)).toBe(false);
  expect(rows.some(row=>row.kind==='legacy-idrs'&&row.record.legacyId===9)).toBe(true);
  expect(rows.some(row=>row.kind==='legacy-dietary'&&row.record.legacyId===10)).toBe(true);
 });
});
