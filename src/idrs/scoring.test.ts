import {describe,it,expect} from 'vitest';
import {calculateIDRS,activityScores,type Answers} from './scoring';
import {calculateBMI} from '../bmi';

const base:Answers={age:34,sex:'male',waist:89,activity:'vigorous',parents:'neither'};

describe('IDRS scoring boundaries',()=>{
  it.each([[18,0],[34,0],[35,20],[49,20],[50,30],[120,30]] as const)('age %i = %i points',(age,score)=>expect(calculateIDRS({...base,age}).factors[0].score).toBe(score));
  it.each([['male',89,0],['male',90,10],['male',99,10],['male',100,20],['female',79,0],['female',80,10],['female',89,10],['female',90,20]] as const)('waist thresholds %s %i = %i',(sex,waist,score)=>expect(calculateIDRS({...base,sex,waist}).factors[1].score).toBe(score));
  it.each([['vigorous',0],['moderate',10],['mild',20],['sedentary',30]] as const)('activity %s = %i',(activity,score)=>expect(activityScores[activity]).toBe(score));
  it.each([['neither',0],['one',10],['both',20]] as const)('parents %s = %i',(parents,score)=>expect(calculateIDRS({...base,parents}).factors[3].score).toBe(score));
  it.each([[0,'low'],[30,'moderate'],[50,'moderate'],[60,'high'],[100,'high']] as const)('total %i classified %s',(expected,risk)=>{
    const answers=expected===0?base:expected===30?{...base,activity:'sedentary' as const}:expected===50?{...base,age:35,activity:'sedentary' as const}:expected===60?{age:50,sex:'male' as const,waist:90,activity:'moderate' as const,parents:'one' as const}:{age:50,sex:'male' as const,waist:100,activity:'sedentary' as const,parents:'both' as const};
    const result=calculateIDRS(answers);expect(result.total).toBe(expected);expect(result.risk).toBe(risk);
  });
  it.each([
    [{...base,age:undefined},'age'],[{...base,sex:undefined},'sex'],[{...base,waist:undefined},'waist'],[{...base,activity:undefined},'activity'],[{...base,parents:undefined},'parents'],
    [{...base,sex:'other'},'sex'],[{...base,activity:'none'},'activity'],[{...base,parents:'unknown'},'parents']
  ])('rejects missing or invalid answer',(answers,_answerKey)=>expect(()=>calculateIDRS(answers as Answers)).toThrow());
  it('rejects invalid age and waist ranges',()=>{expect(()=>calculateIDRS({...base,age:17})).toThrow();expect(()=>calculateIDRS({...base,age:34.5})).toThrow();expect(()=>calculateIDRS({...base,waist:39})).toThrow();expect(()=>calculateIDRS({...base,waist:201})).toThrow()});
  it('does not include height or weight in IDRS even if extra BMI fields are present',()=>{
    const withMeasurements={...base,heightCm:165,weightKg:88};
    expect(calculateIDRS(withMeasurements).total).toBe(calculateIDRS(base).total);
  });
});

describe('BMI and guidance',()=>{
  it.each([[170,65,22.5,'healthy'],[160,45,17.6,'underweight'],[160,70,27.3,'overweight'],[160,80,31.2,'obesity']] as const)('calculates BMI and adult class',(height,weight,value,classification)=>{const result=calculateBMI(height,weight);expect(result.value).toBe(value);expect(result.classification).toBe(classification)});
  it('keeps invalid BMI input separate from the IDRS function',()=>{expect(()=>calculateBMI(0,70)).toThrow();expect(calculateIDRS(base).total).toBe(0)});
});
