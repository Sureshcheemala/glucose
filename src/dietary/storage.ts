import {openDB,type DBSchema} from 'idb';
import type {DietarySnapshot} from './model';
import {ASSESSMENT_DB_VERSION,upgradeAssessmentDatabase} from '../assessment/schema';

interface DietaryDB extends DBSchema{screenings:{key:number;value:Record<string,unknown>;indexes:{'by-date':string}};'dietary-assessments':{key:number;value:DietarySnapshot&{id?:number};indexes:{'by-date':string}};'assessment-sessions':{key:string;value:import('../assessment/model').AssessmentSession;indexes:{'by-date':string}}}
const DB_NAME='glucoguide-local';
async function database(){return openDB<DietaryDB>(DB_NAME,ASSESSMENT_DB_VERSION,{upgrade(db,oldVersion){upgradeAssessmentDatabase(db,oldVersion)}})}
export async function saveDietarySnapshot(snapshot:DietarySnapshot):Promise<number>{const db=await database();const value=structuredClone(snapshot);delete value.assessmentId;const id=await db.add('dietary-assessments',value as DietarySnapshot&{id?:number});return Number(id)}
export async function listDietarySnapshots():Promise<(DietarySnapshot&{id:number})[]>{const records=await(await database()).getAll('dietary-assessments');return records.sort((a,b)=>b.date.localeCompare(a.date)) as (DietarySnapshot&{id:number})[]}
export async function removeDietarySnapshot(id:number){return(await database()).delete('dietary-assessments',id)}
export async function clearDietarySnapshots(){return(await database()).clear('dietary-assessments')}
