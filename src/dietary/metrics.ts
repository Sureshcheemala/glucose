import type {DiabetesMetricsForm,DiabetesMetricsSnapshot,DietaryLang,DatedMetric} from './model';

/** Broad input-format checks only; these are not clinical cutoffs or interpretations. */
export const METRIC_INPUT_LIMITS={hba1c:{min:0.1,max:30,step:0.1,unit:'%' as const},glucose:{min:1,max:2000,step:1,unit:'mg/dL' as const},postMealHours:{min:0.25,max:24,step:0.25},durationYears:{min:0,max:100,step:0.5}} as const;
export type MetricsValidationIssue='invalid-number'|'out-of-range'|'date-required'|'invalid-date'|'future-date'|'time-requires-value';
export interface MetricsValidationError{field:keyof DiabetesMetricsForm;issue:MetricsValidationIssue}
const isEmpty=(value:string)=>value.trim()==='';
function localToday():string{const date=new Date();const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);return local.toISOString().slice(0,10)}
function numberValue(value:string):number|undefined{return isEmpty(value)?undefined:Number(value)}
function validateNumber(field:keyof DiabetesMetricsForm,value:string,min:number,max:number,errors:MetricsValidationError[]){
 const parsed=numberValue(value);if(parsed===undefined)return;
 if(!Number.isFinite(parsed)){errors.push({field,issue:'invalid-number'});return}
 if(parsed<min||parsed>max)errors.push({field,issue:'out-of-range'});
}
function validateMeasurementDate(value:string,dateField:keyof DiabetesMetricsForm,errors:MetricsValidationError[],today:string){
 if(isEmpty(value)){errors.push({field:dateField,issue:'date-required'});return}
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(!match){errors.push({field:dateField,issue:'invalid-date'});return}const [,year,month,day]=match;const calendarDate=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));if(calendarDate.getUTCFullYear()!==Number(year)||calendarDate.getUTCMonth()!==Number(month)-1||calendarDate.getUTCDate()!==Number(day)){errors.push({field:dateField,issue:'invalid-date'});return}
 if(value>today)errors.push({field:dateField,issue:'future-date'});
}
export function validateDiabetesMetrics(form:DiabetesMetricsForm,today=localToday()):MetricsValidationError[]{
 const errors:MetricsValidationError[]=[];
 validateNumber('hba1c',form.hba1c,METRIC_INPUT_LIMITS.hba1c.min,METRIC_INPUT_LIMITS.hba1c.max,errors);
 validateNumber('fastingGlucose',form.fastingGlucose,METRIC_INPUT_LIMITS.glucose.min,METRIC_INPUT_LIMITS.glucose.max,errors);
 validateNumber('postMealGlucose',form.postMealGlucose,METRIC_INPUT_LIMITS.glucose.min,METRIC_INPUT_LIMITS.glucose.max,errors);
 if(!isEmpty(form.hba1c))validateMeasurementDate(form.hba1cDate,'hba1cDate',errors,today);
 if(!isEmpty(form.fastingGlucose))validateMeasurementDate(form.fastingDate,'fastingDate',errors,today);
 if(!isEmpty(form.postMealGlucose))validateMeasurementDate(form.postMealDate,'postMealDate',errors,today);
 validateNumber('postMealHours',form.postMealHours,METRIC_INPUT_LIMITS.postMealHours.min,METRIC_INPUT_LIMITS.postMealHours.max,errors);
 if(!isEmpty(form.postMealHours)&&isEmpty(form.postMealGlucose))errors.push({field:'postMealHours',issue:'time-requires-value'});
 validateNumber('durationYears',form.durationYears,METRIC_INPUT_LIMITS.durationYears.min,METRIC_INPUT_LIMITS.durationYears.max,errors);
 return errors;
}
export function hasDiabetesMetrics(form:DiabetesMetricsForm):boolean{return [form.hba1c,form.fastingGlucose,form.postMealGlucose,form.postMealHours,form.durationYears].some(value=>!isEmpty(value))}
function dated(value:string,date:string,unit:DatedMetric['unit']):DatedMetric|undefined{return isEmpty(value)?undefined:{value:Number(value),unit,measuredAt:date}}
export function makeDiabetesMetricsSnapshot(sessionId:string,form:DiabetesMetricsForm,language:DietaryLang,recordedAt=new Date().toISOString()):DiabetesMetricsSnapshot|undefined{
 if(!hasDiabetesMetrics(form))return undefined;
 if(validateDiabetesMetrics(form).length)throw new Error('Diabetes measurement input is invalid.');
 return {sessionId,recordedAt,language,reviewStatus:'pending_review',hba1c:dated(form.hba1c,form.hba1cDate,'%'),fastingGlucose:dated(form.fastingGlucose,form.fastingDate,'mg/dL'),postMealGlucose:dated(form.postMealGlucose,form.postMealDate,'mg/dL'),postMealHours:numberValue(form.postMealHours),durationYears:numberValue(form.durationYears),sourceReferences:[]};
}
export const EMPTY_DIABETES_METRICS_FORM:DiabetesMetricsForm={hba1c:'',hba1cDate:'',fastingGlucose:'',fastingDate:'',postMealGlucose:'',postMealDate:'',postMealHours:'',durationYears:''};
