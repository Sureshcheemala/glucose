import {openDB} from 'idb';
import type {Factor, Result} from '../idrs/scoring';
import type {RecommendationSnapshot} from '../recommendations/engine';

const DB='glucoguide-local';
const STORE='screenings';

async function db(){
  // Version 2 keeps the existing store/keyPath intact. Legacy records remain readable.
  return openDB(DB,2,{upgrade(database,oldVersion){if(oldVersion<1)database.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});}});
}

export interface Saved extends Result {id?:number;recommendationSnapshot?:RecommendationSnapshot}
export async function listHistory():Promise<Saved[]>{return (await db()).getAll(STORE);}
export function createHistoryRecord(result:Result,recommendationSnapshot:RecommendationSnapshot):Saved{
  return structuredClone({...result,recommendationSnapshot});
}
export async function saveHistory(result:Result,recommendationSnapshot:RecommendationSnapshot){
  const database=await db();const transaction=database.transaction(STORE,'readwrite');
  const id=await transaction.store.add(createHistoryRecord(result,recommendationSnapshot));
  const numericId=Number(id);
  const stored=createHistoryRecord(result,{...recommendationSnapshot,screeningId:numericId});
  await transaction.store.put({...stored,id:numericId});await transaction.done;return numericId;
}
export async function removeHistory(id:number){return (await db()).delete(STORE,id);}
export async function clearHistory(){return (await db()).clear(STORE);}

export interface FactorComparison {
  key:Factor['key'];
  previousAnswer:string;
  currentAnswer:string;
  previousScore:number;
  currentScore:number;
  answerChanged:boolean;
  scoreChanged:boolean;
}
export interface HistoryComparison {
  previousDate:string;
  currentDate:string;
  previousTotal:number;
  currentTotal:number;
  scoreChange:number;
  factors:FactorComparison[];
}

function answersForFactor(result:Result,key:Factor['key']):string {
  const answer=result.answers;
  switch(key){
    case 'age': return String(answer.age);
    case 'waist': return `${answer.sex}:${answer.waist}`;
    case 'activity': return answer.activity;
    case 'parents': return answer.parents;
  }
}

export function compareHistory(current:Result,previous:Result):HistoryComparison {
  return {
    previousDate:previous.date,
    currentDate:current.date,
    previousTotal:previous.total,
    currentTotal:current.total,
    scoreChange:current.total-previous.total,
    factors:current.factors.map(factor=>{
      const previousFactor=previous.factors.find(item=>item.key===factor.key);
      const previousAnswer=answersForFactor(previous,factor.key);
      const currentAnswer=answersForFactor(current,factor.key);
      const previousScore=previousFactor?.score??0;
      return {key:factor.key,previousAnswer,currentAnswer,previousScore,currentScore:factor.score,answerChanged:previousAnswer!==currentAnswer,scoreChanged:previousScore!==factor.score};
    })
  };
}
