import type {RecommendationSnapshot} from '../recommendations/engine';
import type {Result} from '../idrs/scoring';
import type {Answers} from '../idrs/scoring';
import type {DietaryAnswer} from '../dietary/model';
import type {DiabetesMetricsSnapshot,DietaryLang,DietarySnapshot} from '../dietary/model';

export type ParticipantStatus='not-diagnosed'|'diagnosed'|'unknown';
export interface IDRSSessionSnapshot{legacyId:number;result:Result;recommendations?:RecommendationSnapshot}
export interface DietarySessionSnapshot{legacyId:number;snapshot:DietarySnapshot}
export interface DiabetesMetricsSessionSnapshot{legacyId:number;snapshot:DiabetesMetricsSnapshot}
export interface CombinedObservation{id:string;en:string;te:string;sourceModules:('idrs'|'dietary')[];reviewStatus:'pending_review'}
export interface CombinedSummarySnapshot{generatedAt:string;version:string;language:DietaryLang;availableModules:('idrs'|'dietary')[];observations:CombinedObservation[];sourceReferences:{id:string;title:string;url?:string}[];disclaimer:{en:string;te:string}}
export interface AssessmentSession{id:string;createdAt:string;updatedAt:string;participantStatus:ParticipantStatus;idrsSnapshots:IDRSSessionSnapshot[];dietarySnapshots:DietarySessionSnapshot[];diabetesMetricsSnapshots?:DiabetesMetricsSessionSnapshot[];idrsDraft?:{answers:Partial<Answers>;step:number};dietaryDraft?:{answers:Record<string,DietaryAnswer>;language:DietaryLang;step:number;stage?:'questionnaire'|'metrics'|'review';metrics?:import('../dietary/model').DiabetesMetricsForm};combinedSummary?:CombinedSummarySnapshot;completionStatus:'in-progress'|'completed';isDemo?:boolean;demoScenarioId?:string}
export type UnifiedHistoryEntry={kind:'session';session:AssessmentSession}|{kind:'legacy-idrs';id:string;record:IDRSSessionSnapshot;date:string}|{kind:'legacy-dietary';id:string;record:DietarySessionSnapshot;date:string};
