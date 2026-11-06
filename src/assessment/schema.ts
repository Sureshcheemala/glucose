export const ASSESSMENT_DB_VERSION=5;
/** Shared, additive IndexedDB upgrade. Existing store names and records are never rewritten here. */
export function upgradeAssessmentDatabase(database:unknown,_oldVersion:number):void{
 const native=database as IDBDatabase;
 if(!native.objectStoreNames.contains('screenings'))native.createObjectStore('screenings',{keyPath:'id',autoIncrement:true});
 if(!native.objectStoreNames.contains('dietary-assessments')){const dietary=native.createObjectStore('dietary-assessments',{keyPath:'id',autoIncrement:true});dietary.createIndex('by-date','date')}
 if(!native.objectStoreNames.contains('assessment-sessions')){const sessions=native.createObjectStore('assessment-sessions',{keyPath:'id'});sessions.createIndex('by-date','updatedAt')}
 if(!native.objectStoreNames.contains('diabetes-metrics')){const metrics=native.createObjectStore('diabetes-metrics',{keyPath:'id',autoIncrement:true});metrics.createIndex('by-session','sessionId')}
}
