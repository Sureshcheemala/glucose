import {describe,expect,it} from 'vitest';
import {calculateIDRS} from '../idrs/scoring';
import {createRecommendationSnapshot} from '../recommendations/engine';
import type {DietarySnapshot,DiabetesMetricsSnapshot} from '../dietary/model';
import {attachPreviewDietary,attachPreviewIDRS,createPreviewSession} from './previewSession';

const idrs=calculateIDRS({age:42,sex:'male',waist:94,activity:'moderate',parents:'neither'});
const recommendations=createRecommendationSnapshot(idrs,'en','2026-11-06T00:00:00.000Z');
const dietary: DietarySnapshot={date:'2026-11-06T00:00:00.000Z',answers:{meal_pattern:'regular'},language:'en',participantStatus:'diagnosed',questionnaireVersion:'DHA-Q-2.0.0',recommendationRulesVersion:'DHA-R-2.0.0',contentVersion:'DHA-1.0.0',reviewStatus:'pending_review',recommendations:[],sourceReferences:[]};
const metric:DiabetesMetricsSnapshot={sessionId:'preview-a',recordedAt:'2026-11-06T00:00:00.000Z',language:'en',reviewStatus:'pending_review',hba1c:{value:7.1,unit:'%',measuredAt:'2026-11-05'},sourceReferences:[]};

describe('transient unified assessment lifecycle',()=>{
 it('creates an in-memory, incomplete session without module records and pins the IDRS configuration version',()=>{const session=createPreviewSession('unknown','preview-a','2026-11-06T00:00:00.000Z');expect(session).toMatchObject({id:'preview-a',participantStatus:'unknown',idrsScoringVersion:'Prototype scoring configuration 1.0',completionStatus:'in-progress',idrsSnapshots:[],dietarySnapshots:[]})});
 it('keeps IDRS independent and leaves dietary pending until its result exists',()=>{const first=attachPreviewIDRS(createPreviewSession('not-diagnosed','preview-a'),idrs,recommendations);expect(first.idrsSnapshots[0].result.total).toBe(40);expect(first.dietarySnapshots).toHaveLength(0);expect(first.completionStatus).toBe('in-progress');expect(first.idrsSnapshots[0].recommendations).toEqual(recommendations)});
 it('supports dietary-only results and optional metrics without inventing IDRS',()=>{const first=attachPreviewDietary(createPreviewSession('diagnosed','preview-a'),dietary,metric);expect(first.idrsSnapshots).toHaveLength(0);expect(first.dietarySnapshots[0].snapshot).toEqual(dietary);expect(first.diabetesMetricsSnapshots?.[0].snapshot.hba1c?.value).toBe(7.1);expect(first.completionStatus).toBe('in-progress')});
 it('marks both available modules complete while preserving their separate snapshots',()=>{const one=attachPreviewIDRS(createPreviewSession('diagnosed','preview-a'),idrs,recommendations);const both=attachPreviewDietary(one,dietary,undefined,'2026-11-06T00:01:00.000Z');expect(both.completionStatus).toBe('completed');expect(both.idrsSnapshots[0].result.total).toBe(40);expect(both.dietarySnapshots[0].snapshot.answers).toEqual(dietary.answers);expect(both.combinedSummary?.availableModules).toEqual(['idrs','dietary'])});
 it('does not reinterpret partial metric data or allow it to alter IDRS',()=>{const one=attachPreviewIDRS(createPreviewSession('diagnosed','preview-a'),idrs,recommendations);const partialMetric={...metric,fastingGlucose:undefined};const both=attachPreviewDietary(one,dietary,partialMetric);expect(both.idrsSnapshots[0].result.total).toBe(idrs.total);expect(both.diabetesMetricsSnapshots?.[0].snapshot.hba1c?.value).toBe(7.1);expect(both.diabetesMetricsSnapshots?.[0].snapshot.fastingGlucose).toBeUndefined()});
});
