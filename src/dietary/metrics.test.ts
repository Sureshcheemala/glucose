import {describe,expect,it} from 'vitest';
import {EMPTY_DIABETES_METRICS_FORM,hasDiabetesMetrics,makeDiabetesMetricsSnapshot,validateDiabetesMetrics} from './metrics';
import {METRICS_COPY} from './DietaryModule';

describe('optional diabetes metrics input',()=>{
 it('allows no values and does not create an empty metrics snapshot',()=>{
  expect(validateDiabetesMetrics(EMPTY_DIABETES_METRICS_FORM,'2026-11-06')).toEqual([]);
  expect(hasDiabetesMetrics(EMPTY_DIABETES_METRICS_FORM)).toBe(false);
  expect(makeDiabetesMetricsSnapshot('session-1',EMPTY_DIABETES_METRICS_FORM,'en')).toBeUndefined();
 });
 it('accepts partial self-reported metrics and preserves units and dates without interpretation',()=>{
  const form={...EMPTY_DIABETES_METRICS_FORM,hba1c:'7.2',hba1cDate:'2026-11-05',postMealGlucose:'146',postMealDate:'2026-11-04',postMealHours:'2'};
  expect(validateDiabetesMetrics(form,'2026-11-06')).toEqual([]);
  const snapshot=makeDiabetesMetricsSnapshot('session-1',form,'te','2026-11-06T10:00:00Z')!;
  expect(snapshot).toMatchObject({sessionId:'session-1',language:'te',reviewStatus:'pending_review',hba1c:{value:7.2,unit:'%',measuredAt:'2026-11-05'},postMealGlucose:{value:146,unit:'mg/dL',measuredAt:'2026-11-04'},postMealHours:2});
  expect(snapshot).not.toHaveProperty('controlScore');
  expect(snapshot).not.toHaveProperty('interpretation');
 });
 it('requires an associated date for each provided measurement',()=>{
  const errors=validateDiabetesMetrics({...EMPTY_DIABETES_METRICS_FORM,fastingGlucose:'90'},'2026-11-06');
  expect(errors).toContainEqual({field:'fastingDate',issue:'date-required'});
 });
 it('rejects malformed numbers, broad format outliers, invalid calendar dates and future dates',()=>{
  const form={...EMPTY_DIABETES_METRICS_FORM,hba1c:'31',hba1cDate:'2026-02-30',fastingGlucose:'NaN',fastingDate:'2026-11-07'};
  expect(validateDiabetesMetrics(form,'2026-11-06')).toEqual(expect.arrayContaining([
   {field:'hba1c',issue:'out-of-range'},
   {field:'hba1cDate',issue:'invalid-date'},
   {field:'fastingGlucose',issue:'invalid-number'},
   {field:'fastingDate',issue:'future-date'}
  ]));
 });
 it('does not allow elapsed post-meal time without a post-meal measurement',()=>{
  expect(validateDiabetesMetrics({...EMPTY_DIABETES_METRICS_FORM,postMealHours:'2'},'2026-11-06')).toContainEqual({field:'postMealHours',issue:'time-requires-value'});
 });
 it('keeps diagnosed duration optional but validates its input format',()=>{
  expect(validateDiabetesMetrics({...EMPTY_DIABETES_METRICS_FORM,durationYears:'101'},'2026-11-06')).toContainEqual({field:'durationYears',issue:'out-of-range'});
 });
 it('provides complete English and Telugu metric labels and messages pending professional review',()=>{
  expect(Object.keys(METRICS_COPY.en).sort()).toEqual(Object.keys(METRICS_COPY.te).sort());
  expect(Object.values(METRICS_COPY.en).every(value=>Boolean(value.trim()))).toBe(true);
  expect(Object.values(METRICS_COPY.te).every(value=>Boolean(value.trim()))).toBe(true);
  expect(METRICS_COPY.en.review).toContain('review');
  expect(METRICS_COPY.te.review).toContain('సమీక్ష');
 });
});
