import type {AssessmentSession,CombinedObservation,CombinedSummarySnapshot} from './model';
import type {DietaryLang} from '../dietary/model';

const VERSION='COMBINED-EDUCATION-1.0.0';
/** Describes saved module results side by side. It never combines points or estimates probability. */
export function buildCombinedSummary(session:Pick<AssessmentSession,'idrsSnapshots'|'dietarySnapshots'>,language:DietaryLang,generatedAt=new Date().toISOString()):CombinedSummarySnapshot|undefined{
 const idrs=session.idrsSnapshots.at(-1),dietary=session.dietarySnapshots.at(-1);
 if(!idrs&&!dietary)return undefined;
 const availableModules:CombinedSummarySnapshot['availableModules']=[];
 if(idrs)availableModules.push('idrs');if(dietary)availableModules.push('dietary');
 // There is no faculty-reviewed rule connecting IDRS answers to dietary answers.
 // Until one exists, the only combined observation explains the boundary between modules.
 const observations:CombinedObservation[]=idrs&&dietary?[{id:'separate-module-interpretation',en:'Both independent assessments are complete. Review the IDRS screening result and dietary answer-based education separately; no cross-module relationship or cause is inferred.',te:'రెండు స్వతంత్ర అంచనాలు పూర్తయ్యాయి. IDRS స్క్రీనింగ్ ఫలితాన్ని, ఆహార సమాధానాల ఆధారిత విద్యను వేర్వేరుగా పరిశీలించండి. మాడ్యూళ్ల మధ్య సంబంధం లేదా కారణాన్ని మేము ఊహించము.',sourceModules:['idrs','dietary'],reviewStatus:'pending_review'}]:[];
 const sources=new Map<string,{id:string;title:string;url?:string}>();
 idrs?.recommendations?.sources.forEach(source=>sources.set(source.id,{id:source.id,title:source.title,url:source.url}));
 dietary?.snapshot.sourceReferences?.forEach(source=>sources.set(source.id,{id:source.id,title:source.title,url:source.url}));
 return {generatedAt,version:VERSION,language,availableModules,observations,sourceReferences:[...sources.values()],disclaimer:{en:'This summary places saved screening and dietary education information side by side. It does not calculate a combined risk score, establish causation, diagnose diabetes or replace professional advice.',te:'ఈ సారాంశం సేవ్ చేసిన స్క్రీనింగ్, ఆహార విద్యా సమాచారాన్ని పక్కపక్కన చూపుతుంది. ఇది కలిపిన ప్రమాద స్కోరును లెక్కించదు, కారణ సంబంధాన్ని నిర్ధారించదు, మధుమేహాన్ని నిర్ధారించదు లేదా వైద్య సలహాకు ప్రత్యామ్నాయం కాదు.'}};
}
