import {calculateIDRS,type Answers} from '../idrs/scoring';
import {createRecommendationSnapshot} from '../recommendations/engine';
import {DIETARY_QUESTIONS,DIETARY_QUESTIONNAIRE_VERSION} from '../dietary/content';
import {DIETARY_RECOMMENDATION_RULES_VERSION,makeDietarySnapshot,validateDietaryAnswers} from '../dietary/engine';
import {EMPTY_DIABETES_METRICS_FORM,makeDiabetesMetricsSnapshot} from '../dietary/metrics';
import type {DiabetesMetricsForm,DietaryAnswer,DietaryLang,DietarySnapshot} from '../dietary/model';
import type {AssessmentSession,ParticipantStatus} from './model';
import type {RecommendationSnapshot} from '../recommendations/engine';
import type {Result} from '../idrs/scoring';

export type DemoCaseId='not-diagnosed-complete'|'diagnosed-complete-metrics'|'unknown-diet-only'|'idrs-only-pending'|'diagnosed-metrics-omitted'|'diagnosed-partial-metrics';
export interface DemoCaseDefinition{id:DemoCaseId;titleKey:string;descriptionKey:string;participantStatus:ParticipantStatus;idrsAnswers?:Answers;dietaryOverrides?:Record<string,DietaryAnswer>;metricForm?:Partial<DiabetesMetricsForm>}
export const IDRS_DEMO_CASES=[
 {id:'idrs-low',titleKey:'demoLow',descriptionKey:'demoLowDetails',answers:{age:29,sex:'female',waist:74,activity:'vigorous',parents:'neither'}},
 {id:'idrs-moderate',titleKey:'demoModerate',descriptionKey:'demoModerateDetails',answers:{age:42,sex:'male',waist:94,activity:'moderate',parents:'neither'}},
 {id:'idrs-high',titleKey:'demoHigh',descriptionKey:'demoHighDetails',answers:{age:58,sex:'female',waist:96,activity:'sedentary',parents:'both'}},
] as const;
export interface DemoAssessmentSeed{session:AssessmentSession;idrs?:{result:Result;recommendations:RecommendationSnapshot};dietary?:DietarySnapshot;metrics?:import('../dietary/model').DiabetesMetricsSnapshot}
export interface DemoCleanupTarget{id:string;idrsIds:number[];dietaryIds:number[];metricIds:number[]}

/** Fixed synthetic answer profiles; no demo is inserted until a user selects it. */
export const DEMO_CASES:DemoCaseDefinition[]=[
 {id:'not-diagnosed-complete',titleKey:'demoUnifiedNotDiagnosedTitle',descriptionKey:'demoUnifiedNotDiagnosedDescription',participantStatus:'not-diagnosed',idrsAnswers:{age:34,sex:'female',waist:76,activity:'moderate',parents:'neither'},dietaryOverrides:{vegetable_frequency:'several_weekly',pulse_frequency:'several_weekly',whole_fruit_frequency:'daily',sweet_drinks_frequency:'rarely',medical_food_guidance:'no'}},
 {id:'diagnosed-complete-metrics',titleKey:'demoUnifiedDiagnosedTitle',descriptionKey:'demoUnifiedDiagnosedDescription',participantStatus:'diagnosed',idrsAnswers:{age:54,sex:'male',waist:102,activity:'mild',parents:'one'},dietaryOverrides:{meal_pattern:'sometimes_irregular',breakfast_pattern:'sometimes',vegetable_frequency:'rarely',pulse_frequency:'several_weekly',whole_fruit_frequency:'several_weekly',added_sugar_frequency:'several_weekly',sweet_drinks_frequency:'once_twice_weekly',fried_processed_frequency:'once_twice_weekly',medical_food_guidance:'yes',diet_guidance_difficulty:'no'},metricForm:{hba1c:'7.2',hba1cDate:'',fastingGlucose:'132',fastingDate:'',postMealGlucose:'',postMealDate:'',postMealHours:'',durationYears:'6'}},
 {id:'unknown-diet-only',titleKey:'demoUnifiedUnknownTitle',descriptionKey:'demoUnifiedUnknownDescription',participantStatus:'unknown',dietaryOverrides:{vegetable_frequency:'several_weekly',pulse_frequency:'once_twice_weekly',whole_fruit_frequency:'daily',sweet_drinks_frequency:'rarely',medical_food_guidance:'no'}},
 {id:'idrs-only-pending',titleKey:'demoUnifiedPartialTitle',descriptionKey:'demoUnifiedPartialDescription',participantStatus:'not-diagnosed',idrsAnswers:{age:44,sex:'female',waist:84,activity:'mild',parents:'one'}},
 {id:'diagnosed-metrics-omitted',titleKey:'demoUnifiedNoMetricsTitle',descriptionKey:'demoUnifiedNoMetricsDescription',participantStatus:'diagnosed',dietaryOverrides:{meal_pattern:'consistent',vegetable_frequency:'several_weekly',pulse_frequency:'several_weekly',whole_fruit_frequency:'several_weekly',medical_food_guidance:'yes',diet_guidance_difficulty:'sometimes'}},
 {id:'diagnosed-partial-metrics',titleKey:'demoUnifiedPartialMetricsTitle',descriptionKey:'demoUnifiedPartialMetricsDescription',participantStatus:'diagnosed',dietaryOverrides:{meal_pattern:'consistent',vegetable_frequency:'daily',pulse_frequency:'several_weekly',whole_fruit_frequency:'daily',medical_food_guidance:'yes',diet_guidance_difficulty:'no'},metricForm:{hba1c:'6.8',hba1cDate:'',fastingGlucose:'',fastingDate:'',postMealGlucose:'',postMealDate:'',postMealHours:'',durationYears:''}},
];

/** Only explicitly marked session IDs and their own linked records are eligible for demo cleanup. */
export function demoCleanupTargets(sessions:AssessmentSession[]):DemoCleanupTarget[]{
 return sessions.filter(session=>session.isDemo===true&&Boolean(session.demoScenarioId)).map(session=>({id:session.id,idrsIds:session.idrsSnapshots.map(item=>item.legacyId),dietaryIds:session.dietarySnapshots.map(item=>item.legacyId),metricIds:(session.diabetesMetricsSnapshots??[]).map(item=>item.legacyId)}));
}

const baseAnswers:Record<string,DietaryAnswer>={meal_pattern:'consistent',breakfast_pattern:'yes',vegetable_frequency:'several_weekly',pulse_frequency:'several_weekly',whole_fruit_frequency:'several_weekly',cereal_choice:'mixed',added_sugar_frequency:'once_twice_weekly',sweet_drinks_frequency:'rarely',fried_processed_frequency:'once_twice_weekly',salt_habit:'rarely',water_habit:'regularly',medical_food_guidance:'no',diet_guidance_difficulty:'no'};
function dateDaysAgo(days:number,now:Date){const value=new Date(now);value.setDate(value.getDate()-days);const local=new Date(value.getTime()-value.getTimezoneOffset()*60_000);return local.toISOString().slice(0,10)}
function exampleDietaryAnswers(status:ParticipantStatus,overrides:Record<string,DietaryAnswer>={}):Record<string,DietaryAnswer>{
 const allowed=new Set(DIETARY_QUESTIONS.filter(question=>!question.visibility||question.visibility===status).map(question=>question.id));
 const answers=Object.fromEntries(Object.entries({...baseAnswers,...overrides}).filter(([id])=>allowed.has(id)));
 if(validateDietaryAnswers(answers,DIETARY_QUESTIONS.filter(question=>!question.visibility||question.visibility===status)).length)throw new Error('Demo answer profile does not satisfy the current questionnaire.');
 return answers;
}
export function buildDemoAssessment(definition:DemoCaseDefinition,language:DietaryLang='en',now=new Date()):DemoAssessmentSeed{
 const id=`demo-${definition.id}-${globalThis.crypto?.randomUUID?.()??`${now.getTime()}-${Math.random().toString(36).slice(2)}`}`;
 const createdAt=now.toISOString();const session:AssessmentSession={id,createdAt,updatedAt:createdAt,participantStatus:definition.participantStatus,idrsSnapshots:[],dietarySnapshots:[],diabetesMetricsSnapshots:[],completionStatus:'in-progress',isDemo:true,demoScenarioId:definition.id};
 let idrs:DemoAssessmentSeed['idrs'];let dietary:DietarySnapshot|undefined;let metrics:DemoAssessmentSeed['metrics'];
 if(definition.idrsAnswers){const result={...calculateIDRS(definition.idrsAnswers),date:createdAt};idrs={result,recommendations:createRecommendationSnapshot(result,language,createdAt)}}
 if(definition.dietaryOverrides){dietary=makeDietarySnapshot(exampleDietaryAnswers(definition.participantStatus,definition.dietaryOverrides),language,createdAt,definition.participantStatus);if(dietary.questionnaireVersion!==DIETARY_QUESTIONNAIRE_VERSION||dietary.recommendationRulesVersion!==DIETARY_RECOMMENDATION_RULES_VERSION)throw new Error('Demo content versions are not current.')}
 if(definition.metricForm){const form={...EMPTY_DIABETES_METRICS_FORM,...definition.metricForm};if(definition.metricForm.hba1c)form.hba1cDate=dateDaysAgo(14,now);if(definition.metricForm.fastingGlucose)form.fastingDate=dateDaysAgo(10,now);if(definition.metricForm.postMealGlucose)form.postMealDate=dateDaysAgo(7,now);metrics=makeDiabetesMetricsSnapshot(id,form,language,createdAt)}
 session.completionStatus=idrs&&dietary?'completed':'in-progress';
 return {session,idrs,dietary,metrics};
}
