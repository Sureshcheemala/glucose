import {describe,it,expect} from 'vitest';
import {calculateIDRS} from '../idrs/scoring';
import {createRecommendationSnapshot,recommendationPlan,recommendations,explainFactors,normalizeRecommendationSnapshot,validateRecommendationCatalog,recommendationCardDetails} from './engine';
import {validateArticleCatalog,educationTopic} from '../content/articles';

const result=(overrides:Partial<Parameters<typeof calculateIDRS>[0]>={})=>calculateIDRS({age:28,sex:'female',waist:72,activity:'moderate',parents:'neither',...overrides});
describe('deterministic personalized recommendation rules',()=>{
 it.each([
  ['sedentary','movement-sedentary'],['mild','movement-mild'],['moderate','movement-moderate'],['vigorous','movement-vigorous'],
 ] as const)('selects the matching movement education for %s activity',(activity,id)=>{
  const plan=recommendationPlan(result({activity}),'en');
  expect(plan.personalized[0].id).toBe(id);
  expect(plan.personalized[0].whyItMatters.toLowerCase()).toContain(activity==='vigorous'||activity==='moderate'?'reported':'selected');
 });
 it.each([
  [79,0], [80,10], [90,20],
 ] as const)('uses the source-defined waist band at %s cm and selects education only when scored',(waist,score)=>{
  const scored=calculateIDRS({age:25,sex:'female',waist,activity:'vigorous',parents:'neither'});
  const plan=recommendationPlan(scored,'en');
  expect(scored.factors.find(item=>item.key==='waist')?.score).toBe(score);
  expect(plan.personalized.some(item=>item.id==='waist-awareness')).toBe(score>0);
  if(score>0)expect(plan.personalized.find(item=>item.id==='waist-awareness')?.whyItMatters).toContain('Your recorded waist measurement contributed');
 });
 it.each([
  ['neither',false],['one',true],['both',true],
 ] as const)('uses family history answer %s without inferring activity',(parents,selected)=>{
  const plan=recommendationPlan(result({parents,activity:'vigorous'}),'en');
  expect(plan.personalized.some(item=>item.id==='family-history')).toBe(selected);
  const movement=plan.personalized.find(item=>item.id==='movement-vigorous')!;
  expect(movement.whyItMatters).toContain('vigorous');
  if(selected)expect(plan.personalized.find(item=>item.id==='family-history')?.whyItMatters).toContain(parents==='both'?'both parents':'one parent');
 });
 it.each([[34,0],[35,20],[50,30]] as const)('adds a non-modifiable age explanation when age contributes (%s years)',(age,score)=>{
  const screened=result({age});const plan=recommendationPlan(screened,'en');
  expect(screened.factors.find(item=>item.key==='age')?.score).toBe(score);
  const ageCard=plan.personalized.find(item=>item.id==='age-context');
  expect(Boolean(ageCard)).toBe(score>0);
  if(ageCard){expect(ageCard.modifiability).toBe('non_modifiable');expect(ageCard.whyItMatters).toContain('Age is one of the factors used in IDRS');expect(ageCard.whyItMatters).not.toContain('At ')}
 });
 it('keeps neutral age education at the supported age boundaries',()=>{
  for(const age of [18,120]){
   const screened=result({age});
   expect(screened.answers.age).toBe(age);
   const ageCard=recommendationPlan(screened,'en').personalized.find(item=>item.id==='age-context');
   if(age===18)expect(ageCard).toBeUndefined();
   else expect(ageCard?.whyItMatters).toBe('Age is one of the factors used in IDRS. It cannot be changed, but understanding its contribution can help you interpret your screening result.');
  }
 });
 it('shows exactly three initial priorities and fills with non-inferred general education',()=>{
  const plan=recommendationPlan(result(),'en');
  expect(plan.initial).toHaveLength(3);
  expect(plan.initial[0].id).toBe('movement-moderate');
  expect(plan.initial.slice(1).every(item=>item.category==='healthy-eating'||item.category==='preventive-screening'||item.category==='sleep-routine')).toBe(true);
  expect(plan.all.some(item=>item.id==='general-sugary-drinks')).toBe(true);
 });
 it('returns all applicable items for View all without duplicate IDs',()=>{
  const plan=recommendationPlan(result({age:52,waist:96,activity:'sedentary',parents:'both'}),'en');
  expect(plan.initial).toHaveLength(3);
  expect(plan.all.length).toBeGreaterThan(plan.initial.length);
  expect(new Set(plan.all.map(item=>item.id)).size).toBe(plan.all.length);
  expect(plan.all.map(item=>item.id)).toContain('age-context');
 });
 it('keeps overall category guidance independent of factor-specific recommendations',()=>{
  const first=result({age:35,activity:'moderate',waist:72,parents:'neither'});
  const second=result({age:25,activity:'sedentary',waist:80,parents:'neither'});
  expect(first.risk).toBe(second.risk);
  const firstPlan=recommendationPlan(first,'en'),secondPlan=recommendationPlan(second,'en');
  expect(firstPlan.overall.id).toBe(secondPlan.overall.id);
  expect(firstPlan.personalized.map(item=>item.id)).not.toEqual(secondPlan.personalized.map(item=>item.id));
  expect(secondPlan.overall.practicalSuggestions[0]).toContain('blood glucose testing');
 });
 it('keeps waist education separate from measurement instruction and does not infer habits',()=>{
  const plan=recommendationPlan(result({waist:96,activity:'vigorous',parents:'both'}),'en');
  const waist=plan.personalized.find(item=>item.id==='waist-awareness')!;
  expect(waist.title).toBe('Understand waist and metabolic health');
  expect(waist.linkedArticleIds).toEqual(['food-balanced','activity-benefits']);
  expect(`${waist.whyItMatters} ${waist.practicalSuggestions.join(' ')}`).not.toMatch(/\b(tape|rib|hip bone|how to measure)\b/i);
  const waistArticle=educationTopic('measurements-waist','en')!;
  expect(waistArticle.title).toBe('How to measure waist circumference');
  expect(waistArticle.sections.map(section=>section.content).join(' ')).toContain('Keep the tape level and comfortable');
  expect(validateArticleCatalog()).toBe(true);
  expect(plan.personalized.find(item=>item.id==='family-history')?.whyItMatters).not.toContain('inactive');
  expect(plan.personalized.find(item=>item.id==='movement-vigorous')?.whyItMatters).toContain('vigorous');
 });
 it('keeps moderate activity affirming and answer-specific',()=>{
  const item=recommendationPlan(result({activity:'moderate'}),'en').personalized[0];
  expect(item.title).toBe('Maintain a sustainable activity routine');
  expect(item.whyItMatters).toContain('reported regular moderate activity');
  expect(item.whyItMatters).not.toMatch(/inactive|sedentary|no exercise/i);
  expect(item.linkedArticleIds).toContain('activity-routine');
  expect(item.practicalSuggestions.join(' ')).toContain('Break up long periods of sitting');
 });
 it('keeps category guidance concise and testing advice in the overall section',()=>{
  const guidance=recommendationPlan(result({age:35}),'en').overall;
  expect(guidance.practicalSuggestions[0]).toContain('blood glucose testing');
  expect(guidance.whyItMatters).toContain('does not establish whether diabetes is present');
  expect(guidance.whyItMatters).not.toContain('A lower score');
 });
 it('hides confusing modifiability labels and only returns titled sources for cards',()=>{
  const card=recommendationPlan(result(),'en').personalized[0];
  expect(card.modifiability).toBe('modifiable');
  const display=recommendationCardDetails(card);
  expect(display.showModifiability).toBe(false);
  expect(display.sources.length).toBeGreaterThan(0);
  expect(display.sources.every(source=>source.title.trim().length>0)).toBe(true);
  expect(recommendationCardDetails({...card,sources:[]}).sources).toEqual([]);
 });
 it('localizes every recommendation, retains review status, sources and linked articles',()=>{
  const telugu=recommendations(result({parents:'one',activity:'mild',waist:84}),'te');
  expect(telugu[0].title).toContain('IDRS');
  expect(telugu.find(item=>item.id==='family-history')?.whyItMatters).toContain('ఒకరికి');
  expect(telugu.every(item=>item.reviewStatus==='pending_review')).toBe(true);
  expect(validateRecommendationCatalog()).toBe(true);
  expect(validateArticleCatalog()).toBe(true);
 });
 it('explains each recorded factor answer, score and scoring rule separately',()=>{
  const factors=explainFactors(result({age:52,waist:92,parents:'one',activity:'mild'}),'en');
  expect(factors).toHaveLength(4);
  expect(factors.map(factor=>factor.id)).toEqual(['age','waist','activity','parents']);
  for(const factor of factors){expect(factor.answer).not.toBe('');expect(factor.scoreRule).not.toBe('');expect(factor.whyIncluded).not.toBe('');expect(factor.articleId).not.toBe('')}
 });
 it('preserves the original generated content, selected ids, language and screening data in snapshots',()=>{
  const screened=result({age:56,waist:96,activity:'sedentary',parents:'both'});
  const saved=createRecommendationSnapshot(screened,'te','2026-11-05T00:00:00.000Z');
  expect(saved.initialDisplayIds).toHaveLength(3);
  expect(saved.answers).toEqual(screened.answers);
  expect(saved.factorScores).toEqual(Object.fromEntries(screened.factors.map(factor=>[factor.key,factor.score])));
  expect(saved.overallGuidance.title).toContain('ఎక్కువ');
  const oldMovement=saved.items.find(item=>item.id==='movement-sedentary');
  expect(oldMovement?.title).toContain('కదలిక');
  expect(saved.selectedRecommendationIds).toContain(oldMovement?.id);
  const newer=createRecommendationSnapshot(screened,'en','2026-12-01T00:00:00.000Z');
  expect(saved.language).toBe('te');expect(saved.items.find(item=>item.id===oldMovement?.id)?.title).toBe(oldMovement?.title);
  const reopened=normalizeRecommendationSnapshot(screened,JSON.parse(JSON.stringify(saved)));
  expect(reopened).toEqual(saved);
  expect(newer.language).toBe('en');
 });
});
