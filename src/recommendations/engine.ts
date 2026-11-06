import type {Lang} from '../localization/words';
import type {Answers,Factor,Result,Risk} from '../idrs/scoring';
import {HEALTH_RECOMMENDATIONS,MOVEMENT_RECOMMENDATIONS,overallGuidance} from '../content/recommendations';
import type {DisplayedRecommendation,HealthRecommendation,LocalizedText,RecommendationSnapshotItem,SavedScreeningSnapshot,SourceReference} from '../content/model';
import {educationTopic,EDUCATION_ARTICLES} from '../content/articles';

export const RECOMMENDATION_CONTENT_VERSION='1.0.0-draft';
export type RecommendationSection='overall'|'priority'|'general';
export interface Recommendation extends DisplayedRecommendation {}
export type RecommendationSnapshot=SavedScreeningSnapshot;
export interface FactorExplanation {id:Factor['key'];title:string;answer:string;score:number;scoreRule:string;whyIncluded:string;articleId:string}
export interface RecommendationPlan {overall:Recommendation;personalized:Recommendation[];general:Recommendation[];initial:Recommendation[];all:Recommendation[]}
export function recommendationCardDetails(item:Recommendation){return {showModifiability:false,sources:item.sources.filter(source=>source.title.trim().length>0)}}
const localized=(text:LocalizedText,lang:Lang)=>text[lang];
function copyRecommendation(item:HealthRecommendation,lang:Lang,section:RecommendationSection):Recommendation{
 const {title,whyItMatters,practicalSuggestions,...rest}=structuredClone(item);
 return {...rest,title:localized(title,lang),whyItMatters:localized(whyItMatters,lang),practicalSuggestions:practicalSuggestions.map(text=>localized(text,lang)),section};
}
function riskItem(risk:Risk,lang:Lang):Recommendation{
 const copy=overallGuidance[risk];
 const item:HealthRecommendation={id:`overall-${risk}`,category:'overall-screening',triggers:[{factor:'riskCategory',condition:risk}],title:copy.title,whyItMatters:copy.whyItMatters,practicalSuggestions:copy.suggestions,modifiability:'contextual',linkedArticleIds:['learn-idrs-diagnose','screening-blood-glucose'],sources:[{id:'idrs-2005',title:'A simplified Indian Diabetes Risk Score for screening for undiagnosed diabetic subjects',organization:'Mohan et al., JAPI',url:'https://pubmed.ncbi.nlm.nih.gov/16334618/',publicationYear:2005,accessedAt:'2026-11-05'},{id:'niddk-tests',title:'Diabetes tests and diagnosis',organization:'NIDDK',url:'https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis',accessedAt:'2026-11-05'}],version:RECOMMENDATION_CONTENT_VERSION,reviewStatus:'pending_review'};
 return copyRecommendation(item,lang,'overall');
}
function factorScore(result:Result,key:Factor['key']){return result.factors.find(factor=>factor.key===key)?.score??0}
function interpolateRecommendation(item:Recommendation,answers:Answers,result:Result,lang:Lang):Recommendation{
 const values:Record<string,string>={
  '{{waist}}':String(answers.waist),
  '{{score}}':String(item.id==='waist-awareness'?factorScore(result,'waist'):item.id==='family-history'?factorScore(result,'parents'):factorScore(result,'age')),
  '{{parentCount}}':lang==='te'?(answers.parents==='both'?'ఇద్దరు తల్లిదండ్రులు':'ఒక తల్లిదండ్రి'):(answers.parents==='both'?'both parents':'one parent'),
  '{{familyHistory}}':answers.parents==='both'?'తల్లిదండ్రుల్లో ఇద్దరికీ మధుమేహం ఉందని తెలిపారు':'తల్లిదండ్రుల్లో ఒకరికి మధుమేహం ఉందని తెలిపారు',
 };
 const fill=(text:string)=>Object.entries(values).reduce((value,[key,replacement])=>value.replaceAll(key,replacement),text);
 return {...item,whyItMatters:fill(item.whyItMatters),title:fill(item.title),practicalSuggestions:item.practicalSuggestions.map(fill)};
}
function personalizedRecommendations(result:Result,lang:Lang):Recommendation[]{
 const activity=MOVEMENT_RECOMMENDATIONS[result.answers.activity];
 const ordered:Recommendation[]=[copyRecommendation(activity,lang,'priority')];
 if(factorScore(result,'waist')===10||factorScore(result,'waist')===20){const item=HEALTH_RECOMMENDATIONS.find(value=>value.id==='waist-awareness')!;ordered.push(interpolateRecommendation(copyRecommendation(item,lang,'priority'),result.answers,result,lang));}
 if(result.answers.parents!=='neither'){const item=HEALTH_RECOMMENDATIONS.find(value=>value.id==='family-history')!;ordered.push(interpolateRecommendation(copyRecommendation(item,lang,'priority'),result.answers,result,lang));}
 if(factorScore(result,'age')>0){const item=HEALTH_RECOMMENDATIONS.find(value=>value.id==='age-context')!;ordered.push(interpolateRecommendation(copyRecommendation(item,lang,'priority'),result.answers,result,lang));}
 return ordered;
}
function generalRecommendations(lang:Lang){return HEALTH_RECOMMENDATIONS.filter(item=>item.id.startsWith('general-')).map(item=>copyRecommendation(item,lang,'general'))}
export function recommendationPlan(result:Result,lang:Lang):RecommendationPlan{
 const overall=riskItem(result.risk,lang),personalized=personalizedRecommendations(result,lang),general=generalRecommendations(lang);
 // Transparent order: answer-triggered practical guidance first, then general education fills the three-card introduction.
 const initial=[...personalized,...general].slice(0,3);
 const all=[...personalized,...general];
 return {overall,personalized,general,initial,all};
}
export function recommendations(result:Result,lang:Lang):Recommendation[]{const plan=recommendationPlan(result,lang);return [plan.overall,...plan.all]}
export function createRecommendationSnapshot(result:Result,language:Lang,createdAt=new Date().toISOString(),screeningId?:number):RecommendationSnapshot{
 const plan=recommendationPlan(result,language);
 const overallGuidance=structuredClone(plan.overall);
 const items=structuredClone(plan.all);
 const sources=new Map<string,SourceReference>();[overallGuidance,...items].forEach(item=>item.sources.forEach(source=>sources.set(source.id,structuredClone(source))));
 return {screeningId,screeningDate:result.date,createdAt,language,score:result.total,category:result.risk,answers:{...result.answers},factorScores:Object.fromEntries(result.factors.map(factor=>[factor.key,factor.score])),overallGuidance,selectedRecommendationIds:items.map(item=>item.id),initialDisplayIds:plan.initial.map(item=>item.id),items,contentVersion:RECOMMENDATION_CONTENT_VERSION,reviewStatus:'pending_review',sources:[...sources.values()]};
}
export function normalizeRecommendationSnapshot(result:Result,value:unknown):RecommendationSnapshot|undefined{
 if(!value||typeof value!=='object')return undefined;
 const saved=value as Record<string,unknown>;
 if(Array.isArray(saved.items)&&saved.overallGuidance&&saved.initialDisplayIds&&saved.sources){return structuredClone(saved as unknown as RecommendationSnapshot)}
 // Preserve pre-content-catalog snapshots without regenerating their displayed wording.
 if(!Array.isArray(saved.items))return undefined;
 type LegacyItem={id:string;title:string;why?:string;suggestion?:string;modifiable?:boolean;priority?:string;contentVersion?:string;sourceReferences?:SourceReference[]};
 const old=saved.items as LegacyItem[];
 const convert=(item:LegacyItem,section:RecommendationSection):Recommendation=>({
  id:item.id,category:'legacy-screening-education',triggers:[],title:item.title,whyItMatters:item.why??'',practicalSuggestions:item.suggestion?[item.suggestion]:[],modifiability:item.modifiable?'modifiable':'contextual',linkedArticleIds:[],sources:structuredClone(item.sourceReferences??[]),version:item.contentVersion??String(saved.contentVersion??'legacy'),reviewStatus:'pending_review',section,
 });
 const oldOverall=old.find(item=>item.priority==='overall'||item.id.startsWith('overall_'));
 const overall=oldOverall?convert(oldOverall,'overall'):riskItem(result.risk,(saved.language==='te'?'te':'en'));
 const items=old.filter(item=>item!==oldOverall).map(item=>convert(item,item.priority==='general'?'general':'priority'));
 const language:Lang=saved.language==='te'?'te':'en';
 const priorityItems=items.filter(item=>item.section==='priority');
 const all=[...items];
 const refs=new Map<string,SourceReference>();[overall,...items].forEach(item=>item.sources.forEach(source=>refs.set(source.id,source)));
 return {screeningId:typeof saved.screeningId==='number'?saved.screeningId:undefined,screeningDate:result.date,createdAt:typeof saved.createdAt==='string'?saved.createdAt:result.date,language,score:result.total,category:result.risk,answers:{...result.answers},factorScores:Object.fromEntries(result.factors.map(factor=>[factor.key,factor.score])),overallGuidance:overall,selectedRecommendationIds:all.map(item=>item.id),initialDisplayIds:priorityItems.slice(0,3).map(item=>item.id),items:all,contentVersion:String(saved.contentVersion??'legacy'),reviewStatus:'pending_review',sources:[...refs.values()]};
}
export function selectInitialRecommendations(snapshot:RecommendationSnapshot){const ids=new Set(snapshot.initialDisplayIds);return snapshot.items.filter(item=>ids.has(item.id))}

const factorCopy:Record<Factor['key'],{title:LocalizedText;why:LocalizedText;articleId:string}>={
 age:{title:{en:'Age',te:'వయస్సు'},why:{en:'Age is included as a non-modifiable screening factor.',te:'వయస్సు మార్చలేని స్క్రీనింగ్ అంశంగా చేర్చబడింది.'},articleId:'learn-idrs'},
 waist:{title:{en:'Waist circumference',te:'నడుము చుట్టుకొలత'},why:{en:'Waist circumference is included using the source-defined thresholds for the recorded sex category.',te:'నమోదు చేసిన లింగ వర్గానికి సూచనలోని పరిమితులను ఉపయోగించి నడుము కొలతను చేర్చారు.'},articleId:'measurements-waist'},
 activity:{title:{en:'Physical activity',te:'శారీరక చురుకుదనం'},why:{en:'The selected activity level contributes to the IDRS score.',te:'ఎంచుకున్న చురుకుదనం స్థాయి IDRS స్కోరులో భాగం.'},articleId:'activity-benefits'},
 parents:{title:{en:'Parental diabetes history',te:'తల్లిదండ్రుల మధుమేహ చరిత్ర'},why:{en:'Parental history is one of the screening factors used in the IDRS reference.',te:'IDRS సూచనలో తల్లిదండ్రుల చరిత్ర స్క్రీనింగ్ అంశాల్లో ఒకటి.'},articleId:'learn-family-history'},
};
export function explainFactors(result:Result,lang:Lang):FactorExplanation[]{return result.factors.map(factor=>{
 const answer=result.answers,copy=factorCopy[factor.key];let answerText='',scoreRule='';
 if(factor.key==='age'){answerText=`${answer.age} ${lang==='te'?'సంవత్సరాలు':'years'}`;scoreRule=lang==='te'?'35 కంటే తక్కువ: 0; 35–49: 20; 50 లేదా ఎక్కువ: 30':'Under 35: 0; 35–49: 20; 50 or older: 30';}
 if(factor.key==='waist'){answerText=`${answer.sex==='male'?(lang==='te'?'పురుషుడు':'Male'):(lang==='te'?'మహిళ':'Female')}, ${answer.waist} ${lang==='te'?'సెం.మీ.':'cm'}`;scoreRule=answer.sex==='male'?(lang==='te'?'90 కంటే తక్కువ: 0; 90–99: 10; 100 లేదా ఎక్కువ: 20':'Under 90 cm: 0; 90–99 cm: 10; 100 cm or more: 20'):(lang==='te'?'80 కంటే తక్కువ: 0; 80–89: 10; 90 లేదా ఎక్కువ: 20':'Under 80 cm: 0; 80–89 cm: 10; 90 cm or more: 20');}
 if(factor.key==='activity'){const labels={vigorous:{en:'Vigorous activity',te:'ఎక్కువ చురుకుదనం'},moderate:{en:'Moderate activity',te:'మధ్యస్థ చురుకుదనం'},mild:{en:'Mild activity',te:'తేలికపాటి చురుకుదనం'},sedentary:{en:'No exercise / sedentary',te:'వ్యాయామం లేదు / కూర్చునే అలవాటు'}};answerText=labels[answer.activity][lang];scoreRule=lang==='te'?'ఎక్కువ చురుకుదనం: 0; మధ్యస్థ: 10; తేలికపాటి: 20; వ్యాయామం లేదు/కూర్చునే అలవాటు: 30':'Vigorous: 0; moderate: 10; mild: 20; no exercise/sedentary: 30';}
 if(factor.key==='parents'){const labels={neither:{en:'Neither parent',te:'తల్లిదండ్రుల్లో ఎవరికీ లేదు'},one:{en:'One parent',te:'ఒక తల్లిదండ్రి'},both:{en:'Both parents',te:'ఇద్దరు తల్లిదండ్రులు'}};answerText=labels[answer.parents][lang];scoreRule=lang==='te'?'ఎవరికీ లేదు: 0; ఒకరు: 10; ఇద్దరూ: 20':'Neither: 0; one parent: 10; both parents: 20';}
 return {id:factor.key,title:copy.title[lang],answer:answerText,score:factor.score,scoreRule,whyIncluded:copy.why[lang],articleId:copy.articleId};
 })}
export function validateRecommendationCatalog(){return HEALTH_RECOMMENDATIONS.every(item=>item.title.en&&item.title.te&&item.whyItMatters.en&&item.whyItMatters.te&&item.practicalSuggestions.length>0&&item.sources.length>0&&item.linkedArticleIds.every(id=>EDUCATION_ARTICLES.some(article=>article.id===id))&&['draft','pending_review','approved','retired'].includes(item.reviewStatus))&&Object.values(MOVEMENT_RECOMMENDATIONS).every(item=>item.linkedArticleIds.every(id=>EDUCATION_ARTICLES.some(article=>article.id===id)))}
export function articleForRecommendation(id:string,lang:Lang){return educationTopic(id,lang)}
export type {RecommendationSnapshotItem,SourceReference};
