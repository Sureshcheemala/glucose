import {describe,expect,it} from 'vitest';
import {ASSESSMENT_DB_VERSION,upgradeAssessmentDatabase} from './schema';

function fakeDatabase(existing:string[]){const names=new Set(existing);const created:string[]=[];const indexes:Record<string,string[]>={};const database={objectStoreNames:{contains:(name:string)=>names.has(name)},createObjectStore:(name:string)=>{names.add(name);created.push(name);return {createIndex:(index:string)=>{indexes[name]??=[];indexes[name].push(index)}}}};return {database:database as unknown as IDBDatabase,created,indexes,names}}

describe('additive assessment database upgrade',()=>{
 it('adds session and metrics stores to a version 3 schema without changing synthetic legacy records',()=>{const db=fakeDatabase(['screenings','dietary-assessments']);const syntheticLegacyRows={screenings:[{id:7,total:40}],dietary:[{id:8,answers:{}}]};const before=structuredClone(syntheticLegacyRows);upgradeAssessmentDatabase(db.database,3);expect(ASSESSMENT_DB_VERSION).toBe(5);expect(db.created).toEqual(['assessment-sessions','diabetes-metrics']);expect(db.indexes['assessment-sessions']).toEqual(['by-date']);expect(db.indexes['diabetes-metrics']).toEqual(['by-session']);expect(syntheticLegacyRows).toEqual(before);expect(db.names.has('screenings')).toBe(true);expect(db.names.has('dietary-assessments')).toBe(true)});
 it('adds all missing stores for a new database',()=>{const db=fakeDatabase([]);upgradeAssessmentDatabase(db.database,0);expect(db.created).toEqual(['screenings','dietary-assessments','assessment-sessions','diabetes-metrics']);expect(db.indexes['dietary-assessments']).toEqual(['by-date']);expect(db.indexes['assessment-sessions']).toEqual(['by-date']);expect(db.indexes['diabetes-metrics']).toEqual(['by-session'])});
});
