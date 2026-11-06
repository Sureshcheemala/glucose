import {describe,it,expect} from 'vitest';
import {QUESTIONNAIRE_RANGES,hasValidQuestionnaire,validateQuestionAnswer,validateQuestionnaire} from './validation';

const answers={age:35,sex:'female' as const,waist:80,activity:'mild' as const,parents:'one' as const};
describe('questionnaire step validation',()=>{
 it('accepts configured inclusive age and waist bounds',()=>{
  expect(QUESTIONNAIRE_RANGES).toEqual({age:{min:18,max:120,step:1},waist:{min:40,max:200,step:0.1}});
  expect(validateQuestionAnswer('age',18)).toBeNull();expect(validateQuestionAnswer('age',120)).toBeNull();
  expect(validateQuestionAnswer('waist',40)).toBeNull();expect(validateQuestionAnswer('waist',200)).toBeNull();
 });
 it.each([['age',undefined],['age',17],['age',35.5],['age',121],['waist',undefined],['waist',39.9],['waist',200.1],['sex','other'],['activity','sometimes'],['parents','unknown']] as const)('rejects invalid %s answer %s',(key,value)=>expect(validateQuestionAnswer(key as keyof typeof answers,value)).not.toBeNull());
 it('requires every step and accepts a complete answer set',()=>{
  expect(validateQuestionnaire({age:35}).sex).toBe('required');
  expect(hasValidQuestionnaire(answers)).toBe(true);
  expect(hasValidQuestionnaire({...answers,age:undefined})).toBe(false);
 });
});
