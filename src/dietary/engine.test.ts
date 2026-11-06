import {describe,it,expect} from 'vitest';
import {DIETARY_ARTICLES,DIETARY_CONTENT_VERSION,DIETARY_QUESTIONS,DIETARY_RECOMMENDATIONS} from './content';
import {DIETARY_RECOMMENDATION_RULES_VERSION,generateDietaryRecommendations,initialDietaryPriorities,makeDietarySnapshot,questionsForSnapshot,reportsProfessionalEatingPlan,recommendationTranslationsComplete,validateDietaryAnswers,validateDietaryContent} from './engine';
import type {DietaryAnswer} from './model';
import {calculateBMI} from '../bmi';
import {calculateIDRS,type Answers} from '../idrs/scoring';
import {DIETARY_UI} from './DietaryModule';

function completeAnswers(){
  const defaults:Record<string,string>={meal_pattern:'consistent',breakfast_pattern:'yes',vegetable_frequency:'daily',pulse_frequency:'several_weekly',whole_fruit_frequency:'several_weekly',cereal_choice:'mostly_whole',added_sugar_frequency:'once_twice_weekly',sweet_drinks_frequency:'rarely',fried_processed_frequency:'once_twice_weekly',salt_habit:'rarely',water_habit:'regularly'};
  return Object.fromEntries(DIETARY_QUESTIONS.filter(question=>!question.optional).map(question=>[question.id,defaults[question.id]??question.options[0].id])) as Record<string,DietaryAnswer>;
}

describe('dietary questionnaire schema and validation',()=>{
  it('provides reviewed bilingual prompts, options, articles and recommendations',()=>{
    expect(validateDietaryContent()).toEqual([]);
    expect(recommendationTranslationsComplete()).toBe(true);
    expect(Object.keys(DIETARY_UI.en).sort()).toEqual(Object.keys(DIETARY_UI.te).sort());
    expect(Object.values(DIETARY_UI.en).every(value=>Boolean(value.trim()))).toBe(true);
    expect(Object.values(DIETARY_UI.te).every(value=>Boolean(value.trim()))).toBe(true);
    expect(DIETARY_QUESTIONS.every(question=>question.prompt.en.trim()&&question.prompt.te.trim())).toBe(true);
    expect(DIETARY_ARTICLES.every(article=>article.sources.length>0&&article.sections.length>0)).toBe(true);
    expect(DIETARY_QUESTIONS.every(question=>question.reviewStatus==='pending_review')).toBe(true);
    expect(DIETARY_QUESTIONS.filter(question=>!question.optional&&!question.visibility)).toHaveLength(11);
    expect(DIETARY_QUESTIONS.every(question=>question.purpose&&question.recommendationIds?.length)).toBe(true);
  });
  it('requires each required answer and allows optional questions to stay unanswered',()=>{
    const answers=completeAnswers();
    expect(validateDietaryAnswers(answers)).toEqual([]);
    expect(validateDietaryAnswers({})).not.toEqual([]);
    expect(validateDietaryAnswers({...answers,medical_food_guidance:'yes'})).toEqual([]);
  });
  it('distinguishes never from not applicable and rejects out-of-list values',()=>{
    const frequency=DIETARY_QUESTIONS.find(question=>question.id==='whole_fruit_frequency')!;
    expect(frequency.options.map(option=>option.id)).toContain('never');
    expect(validateDietaryAnswers({...completeAnswers(),whole_fruit_frequency:'not-an-option'})).toContain('whole_fruit_frequency');
    expect(DIETARY_QUESTIONS.find(question=>question.id==='medical_food_guidance')?.optional).toBe(true);
  });
  it('accepts every declared choice, including optional portion estimates',()=>{
    const baseline=completeAnswers();
    for(const question of DIETARY_QUESTIONS){
      for(const option of question.options){
        expect(validateDietaryAnswers({...baseline,[question.id]:option.id})).not.toContain(question.id);
      }
    }
  });
  it('keeps older questionnaire labels available while using v2 definitions for new snapshots',()=>{
    const legacy={questionnaireVersion:undefined};
    expect(questionsForSnapshot(legacy).find(question=>question.id==='breakfast_usual')?.prompt.en).toContain('breakfast');
    const current=makeDietarySnapshot(completeAnswers(),'en');
    expect(current.questionnaireVersion).toBe('DHA-Q-2.0.0');
    expect(current.recommendationRulesVersion).toBe(DIETARY_RECOMMENDATION_RULES_VERSION);
    expect(questionsForSnapshot(current).map(question=>question.id)).toContain('meal_pattern');
    expect(questionsForSnapshot(current).map(question=>question.id)).not.toContain('breakfast_usual');
  });
});

describe('answer-based educational interpretation',()=>{
  it('preserves the professional-plan reminder for affirmative and partial reports',()=>{
    expect(reportsProfessionalEatingPlan('yes')).toBe(true);
    expect(reportsProfessionalEatingPlan('sometimes')).toBe(true);
    expect(reportsProfessionalEatingPlan('no')).toBe(false);
    expect(reportsProfessionalEatingPlan('unknown')).toBe(false);
    expect(reportsProfessionalEatingPlan(undefined)).toBe(false);
  });
  it('selects relevant education for frequent sweetened drinks',()=>{
    const items=generateDietaryRecommendations({...completeAnswers(),sweet_drinks_frequency:'daily'});
    expect(items.map(item=>item.id)).toContain('sweet-drinks-often');
  });
  it('selects vegetable, pulse and whole-fruit education from the recorded frequencies',()=>{
    const items=generateDietaryRecommendations({...completeAnswers(),vegetable_frequency:'rarely',pulse_frequency:'never',whole_fruit_frequency:'rarely'});
    expect(items.map(item=>item.id)).toEqual(expect.arrayContaining(['vegetables-infrequent','pulses-infrequent','fruit-infrequent']));
  });
  it('selects meal-pattern education without judging the reason for skipped meals',()=>{
    const item=generateDietaryRecommendations({...completeAnswers(),meal_pattern:'often_irregular'}).find(rec=>rec.id==='meal-pattern-review');
    expect(item?.why.en).toContain('cannot explain');
  });
  it('selects cooking and packaged food education independently',()=>{
    const ids=generateDietaryRecommendations({...completeAnswers(),fried_processed_frequency:'daily'}).map(item=>item.id);
    expect(ids).toEqual(expect.arrayContaining(['fried-foods','packaged-foods']));
  });
  it.each([
    ['meal_pattern','often_irregular','meal-pattern-review'],
    ['breakfast_pattern','sometimes','breakfast-routine'],
    ['vegetable_frequency','rarely','vegetables-infrequent'],
    ['pulse_frequency','never','pulses-infrequent'],
    ['whole_fruit_frequency','rarely','fruit-infrequent'],
    ['cereal_choice','mostly_refined','wholegrain-variety'],
    ['added_sugar_frequency','daily','added-sugar-foods'],
    ['sweet_drinks_frequency','several_weekly','sweet-drinks-often'],
    ['fried_processed_frequency','daily','fried-foods'],
    ['salt_habit','often','salt-awareness'],
    ['water_habit','limited','water-awareness']
  ] as const)('maps retained answer %s to education %s', (question,answer,recommendation)=>{
    expect(generateDietaryRecommendations({...completeAnswers(),[question]:answer}).map(item=>item.id)).toContain(recommendation);
  });
  it('uses no score or diagnosis model and limits the starting display to three',()=>{
    const items=generateDietaryRecommendations(completeAnswers());
    expect(initialDietaryPriorities(items)).toHaveLength(3);
    expect(items).toHaveLength(3);
    expect(items.some(item=>/diagnos|risk score|probability/i.test(item.title.en))).toBe(false);
    expect(new Set(items.map(item=>item.id)).size).toBe(items.length);
  });
  it('different answer profiles receive different answer-linked recommendations',()=>{
    const sweet=generateDietaryRecommendations({...completeAnswers(),sweet_drinks_frequency:'daily'}).map(item=>item.id);
    const produce=generateDietaryRecommendations({...completeAnswers(),vegetable_frequency:'never',pulse_frequency:'never'}).map(item=>item.id);
    expect(sweet).toContain('sweet-drinks-often');
    expect(produce).toContain('vegetables-infrequent');
    expect(produce).toContain('pulses-infrequent');
    expect(produce).not.toContain('sweet-drinks-often');
  });
  it('keeps dietary answers separate from IDRS and BMI calculations',()=>{
    const screening:Answers={age:44,sex:'female',waist:82,activity:'mild',parents:'one'};
    const before=calculateIDRS(screening);
    const bmiBefore=calculateBMI(165,68);
    const diet={...completeAnswers(),sweet_drinks:'daily'};
    generateDietaryRecommendations(diet);
    const after=calculateIDRS(screening);
    const bmiAfter=calculateBMI(165,68);
    expect(after.total).toBe(before.total);
    expect(after.factors).toEqual(before.factors);
    expect(bmiAfter).toEqual(bmiBefore);
  });
});

describe('historical dietary snapshot stability',()=>{
  it('preserves language, answers, recommendation text, sources, version and review state',()=>{
    const answers={...completeAnswers(),sweet_drinks:'daily'};
    const snapshot=makeDietarySnapshot(answers,'te','2026-11-06T00:00:00.000Z');
    expect(snapshot.language).toBe('te');
    expect(snapshot.answers.sweet_drinks).toBe('daily');
    expect(snapshot.contentVersion).toBe(DIETARY_CONTENT_VERSION);
    expect(snapshot.reviewStatus).toBe('pending_review');
    expect(snapshot.sourceReferences?.[0].publicationYear).toBe(2024);
    const oldTitle=snapshot.recommendations.find(item=>item.id==='sweet-drinks-often')?.title.te;
    const futureCopy=structuredClone(DIETARY_RECOMMENDATIONS.sweetDrinks);
    DIETARY_RECOMMENDATIONS.sweetDrinks.title.te='భవిష్యత్తులో మార్చిన శీర్షిక';
    expect(snapshot.recommendations.find(item=>item.id==='sweet-drinks-often')?.title.te).toBe(oldTitle);
    DIETARY_RECOMMENDATIONS.sweetDrinks.title.te=futureCopy.title.te;
  });
});
