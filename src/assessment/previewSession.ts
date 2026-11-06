import type {Result} from '../idrs/scoring';
import type {RecommendationSnapshot} from '../recommendations/engine';
import type {DiabetesMetricsSnapshot,DietarySnapshot} from '../dietary/model';
import {buildCombinedSummary} from './combined';
import type {AssessmentSession,ParticipantStatus} from './model';
import {IDRS_REFERENCE} from '../idrs/scoring';

export function createPreviewSession(participantStatus:ParticipantStatus,id:string,createdAt=new Date().toISOString()):AssessmentSession{return {id,createdAt,updatedAt:createdAt,participantStatus,idrsScoringVersion:IDRS_REFERENCE.version,idrsSnapshots:[],dietarySnapshots:[],completionStatus:'in-progress'}}
export function attachPreviewIDRS(session:AssessmentSession,result:Result,recommendations:RecommendationSnapshot,updatedAt=new Date().toISOString()):AssessmentSession{
 const next:AssessmentSession={...session,idrsDraft:undefined,idrsSnapshots:[{legacyId:-1,result:structuredClone(result),recommendations:structuredClone(recommendations)}],updatedAt,completionStatus:session.dietarySnapshots.length?'completed':'in-progress'};
 if(session.dietarySnapshots.length)next.combinedSummary=buildCombinedSummary(next,session.dietarySnapshots.at(-1)!.snapshot.language);return next;
}
export function attachPreviewDietary(session:AssessmentSession,snapshot:DietarySnapshot,metrics?:DiabetesMetricsSnapshot,updatedAt=new Date().toISOString()):AssessmentSession{
 const next:AssessmentSession={...session,dietaryDraft:undefined,dietarySnapshots:[{legacyId:-1,snapshot:structuredClone(snapshot)}],diabetesMetricsSnapshots:metrics?[{legacyId:-1,snapshot:structuredClone(metrics)}]:[],updatedAt,completionStatus:session.idrsSnapshots.length?'completed':'in-progress'};
 next.combinedSummary=buildCombinedSummary(next,snapshot.language);return next;
}
