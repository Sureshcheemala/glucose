import {QUESTIONNAIRE_RANGES} from './validation';

export type Sex = 'male'|'female';
export type Activity = 'vigorous'|'moderate'|'mild'|'sedentary';
export type Parents = 'neither'|'one'|'both';
export type Risk = 'low'|'moderate'|'high';
export interface Answers {age:number; sex:Sex; waist:number; activity:Activity; parents:Parents}
export interface Factor {key:'age'|'waist'|'activity'|'parents'; score:number; max:number}
export interface Result {answers:Answers; total:number; risk:Risk; factors:Factor[]; date:string}
export const IDRS_REFERENCE = {title:'Indian Diabetes Risk Score (IDRS)', version:'Prototype scoring configuration 1.0', inputBounds:'Age 18–120 completed years and waist 40–200 cm are prototype collection limits, not additional IDRS scoring bands.', original:'Mohan et al. A simplified Indian Diabetes Risk Score for screening for undiagnosed diabetic subjects. J Assoc Physicians India. 2005;53:759–763.', source:'https://pubmed.ncbi.nlm.nih.gov/16334618/', activity:['Regular vigorous exercise or strenuous activity at work/home','Regular moderate exercise or moderate activity at work/home','Regular mild exercise or mild activity at work/home','No exercise and/or sedentary activity'], riskCutoffs:'<30 low; 30–50 moderate; ≥60 high'} as const;
export const activityScores:Record<Activity,number>={vigorous:0,moderate:10,mild:20,sedentary:30};
export function calculateIDRS(a:Answers):Result {
 if(!a || typeof a !== 'object') throw new Error('All five screening answers are required.');
 if(!Number.isInteger(a.age)||a.age<QUESTIONNAIRE_RANGES.age.min||a.age>QUESTIONNAIRE_RANGES.age.max) throw new Error(`Age must be a whole number from ${QUESTIONNAIRE_RANGES.age.min} to ${QUESTIONNAIRE_RANGES.age.max}.`);
 if(!Number.isFinite(a.waist)||a.waist<QUESTIONNAIRE_RANGES.waist.min||a.waist>QUESTIONNAIRE_RANGES.waist.max) throw new Error(`Enter a waist measurement from ${QUESTIONNAIRE_RANGES.waist.min} to ${QUESTIONNAIRE_RANGES.waist.max} cm.`);
 if(a.sex!=='male'&&a.sex!=='female') throw new Error('Choose a sex category to apply the reference waist thresholds.');
 if(!Object.hasOwn(activityScores,a.activity)) throw new Error('Choose one physical activity level.');
 if(a.parents!=='neither'&&a.parents!=='one'&&a.parents!=='both') throw new Error('Choose a parental diabetes history option.');
 const age=a.age<35?0:a.age<50?20:30;
 const waist=a.sex==='male'?(a.waist<90?0:a.waist<100?10:20):(a.waist<80?0:a.waist<90?10:20);
 const activity=activityScores[a.activity], parents=a.parents==='neither'?0:a.parents==='one'?10:20;
 const total=age+waist+activity+parents;
 const risk:Risk=total<30?'low':total<=50?'moderate':'high';
 return {answers:a,total,risk,factors:[{key:'age',score:age,max:30},{key:'waist',score:waist,max:20},{key:'activity',score:activity,max:30},{key:'parents',score:parents,max:20}],date:new Date().toISOString()};
}

