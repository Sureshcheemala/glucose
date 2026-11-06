import type {Answers} from './scoring';

/** Input bounds are prototype collection limits. IDRS scoring bands remain in scoring.ts. */
export const QUESTIONNAIRE_RANGES={age:{min:18,max:120,step:1},waist:{min:40,max:200,step:0.1}} as const;
export type QuestionnaireField=keyof Answers;
export type ValidationIssue='required'|'invalid';

export function validateQuestionAnswer(field:QuestionnaireField,value:unknown):ValidationIssue|null{
  if(value===undefined||value===null||value==='')return 'required';
  switch(field){
    case 'age':return typeof value==='number'&&Number.isInteger(value)&&value>=QUESTIONNAIRE_RANGES.age.min&&value<=QUESTIONNAIRE_RANGES.age.max?null:'invalid';
    case 'waist':return typeof value==='number'&&Number.isFinite(value)&&value>=QUESTIONNAIRE_RANGES.waist.min&&value<=QUESTIONNAIRE_RANGES.waist.max?null:'invalid';
    case 'sex':return value==='male'||value==='female'?null:'invalid';
    case 'activity':return value==='vigorous'||value==='moderate'||value==='mild'||value==='sedentary'?null:'invalid';
    case 'parents':return value==='neither'||value==='one'||value==='both'?null:'invalid';
  }
}

export function validateQuestionnaire(answers:Partial<Answers>):Record<QuestionnaireField,ValidationIssue|null>{
  return {age:validateQuestionAnswer('age',answers.age),sex:validateQuestionAnswer('sex',answers.sex),waist:validateQuestionAnswer('waist',answers.waist),activity:validateQuestionAnswer('activity',answers.activity),parents:validateQuestionAnswer('parents',answers.parents)};
}

export function hasValidQuestionnaire(answers:Partial<Answers>):answers is Answers{
  return Object.values(validateQuestionnaire(answers)).every(issue=>issue===null);
}

/** Restores current wrapped drafts and the legacy answer-only shape without trusting persisted values. */
export function normalizeIDRSDraft(value:unknown):{answers:Partial<Answers>;step:number}{
  if(!value||typeof value!=='object'||Array.isArray(value))return {answers:{},step:0};
  const source=value as Record<string,unknown>;
  const wrapped=Object.hasOwn(source,'answers');
  const rawAnswers=wrapped?source.answers:source;
  const answers:Partial<Answers>={};
  if(rawAnswers&&typeof rawAnswers==='object'&&!Array.isArray(rawAnswers)){
    for(const field of ['age','sex','waist','activity','parents'] as const){
      const answer=(rawAnswers as Record<string,unknown>)[field];
      if(validateQuestionAnswer(field,answer)===null)Object.assign(answers,{[field]:answer});
    }
  }
  const rawStep=wrapped?source.step:0;
  const step=typeof rawStep==='number'&&Number.isInteger(rawStep)?Math.max(0,Math.min(4,rawStep)):0;
  return {answers,step};
}
