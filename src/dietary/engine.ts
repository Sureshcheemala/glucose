import {DIETARY_ARTICLES,DIETARY_CONTENT_VERSION,DIETARY_QUESTIONS,DIETARY_QUESTIONNAIRE_VERSION,DIETARY_RECOMMENDATIONS,FREQUENT,ICMR_NIN_2024,LEGACY_DIETARY_QUESTIONS_V1} from './content';
import type {DietaryAnswer,DietaryParticipantStatus,DietaryRecommendation,DietarySnapshot,Localized} from './model';

export const DIETARY_SOURCE_VERSION=DIETARY_CONTENT_VERSION;
export const DIETARY_RECOMMENDATION_RULES_VERSION='DHA-R-2.0.0';
export function questionsForParticipantStatus(status:DietaryParticipantStatus){return DIETARY_QUESTIONS.filter(question=>!question.visibility||question.visibility===status)}
export function questionsForSnapshot(snapshot:Pick<DietarySnapshot,'questionnaireVersion'>){return snapshot.questionnaireVersion===DIETARY_QUESTIONNAIRE_VERSION?DIETARY_QUESTIONS:LEGACY_DIETARY_QUESTIONS_V1}
export function localized(text:Localized,language:'en'|'te'):string{
  const value=text[language];
  if(!value?.trim())throw new Error(`Missing ${language} translation`);
  return value;
}
export function validateDietaryContent():string[]{
  const errors:string[]=[];
  const check=(id:string,text:Localized)=>{if(!text.en.trim()||!text.te.trim())errors.push(`${id}: missing translation`)};
  for(const q of DIETARY_QUESTIONS){check(q.id,q.prompt);q.options.forEach(option=>check(`${q.id}.${option.id}`,option.label));if(!q.contentVersion||q.reviewStatus!=='pending_review')errors.push(`${q.id}: invalid governance metadata`);if(!q.purpose||!q.recommendationIds?.length)errors.push(`${q.id}: missing purpose or recommendation traceability`);else{check(`${q.id}.purpose`,q.purpose);for(const recommendationId of q.recommendationIds)if(!Object.values(DIETARY_RECOMMENDATIONS).some(item=>item.id===recommendationId)&&recommendationId!=='professional-plan-reminder')errors.push(`${q.id}: unknown recommendation ${recommendationId}`)}}
  for(const q of LEGACY_DIETARY_QUESTIONS_V1){check(`legacy.${q.id}`,q.prompt);q.options.forEach(option=>check(`legacy.${q.id}.${option.id}`,option.label))}
  const articleIds=new Set(DIETARY_ARTICLES.map(article=>article.id));
  for(const article of DIETARY_ARTICLES){check(article.id,article.title);check(`${article.id}.intro`,article.introduction);for(const section of article.sections){check(`${article.id}.heading`,section.heading);check(`${article.id}.content`,section.content);check(`${article.id}.examples`,section.examples);check(`${article.id}.misconception`,section.misconception)}article.takeaways.forEach((item,index)=>check(`${article.id}.takeaway${index}`,item));if(!article.sections.length||!article.related.length||!article.sources.includes(ICMR_NIN_2024.id)||article.related.some(id=>!articleIds.has(id))||article.reviewStatus!=='pending_review')errors.push(`${article.id}: incomplete article or metadata`)}
  for(const [id,recommendation] of Object.entries(DIETARY_RECOMMENDATIONS)){check(`${id}.title`,recommendation.title);check(`${id}.why`,recommendation.why);check(`${id}.suggestion`,recommendation.suggestion);check(`${id}.professionalCare`,recommendation.professionalCare);if(!recommendation.sources.length||!articleIds.has(recommendation.articleId)||recommendation.reviewStatus!=='pending_review')errors.push(`${id}: invalid recommendation metadata`)}
  return errors;
}
export function validateDietaryAnswers(answers:Record<string,DietaryAnswer>,questions:readonly typeof DIETARY_QUESTIONS[number][]=DIETARY_QUESTIONS):string[]{
  return questions.filter(question=>{
    const answer=answers[question.id];
    if(answer===undefined)return !question.optional;
    if(Array.isArray(answer))return answer.length===0||answer.some(value=>!question.options.some(option=>option.id===value));
    return !question.options.some(option=>option.id===answer);
  }).map(question=>question.id);
}
function pick(answers:Record<string,DietaryAnswer>,id:string){return answers[id]}
/** A yes or partial/sometimes response means the user reports an existing professional plan. */
export function reportsProfessionalEatingPlan(answer:DietaryAnswer|undefined):boolean{return answer==='yes'||answer==='sometimes'}
function infrequent(value:DietaryAnswer|undefined){return value==='rarely'||value==='never'}
function often(value:DietaryAnswer|undefined){return value==='daily'||value==='several_weekly'||value==='often'}
export function generateDietaryRecommendations(answers:Record<string,DietaryAnswer>,participantStatus:DietaryParticipantStatus='unknown'):DietaryRecommendation[]{
  const selected:DietaryRecommendation[]=[];
  const add=(recommendation:DietaryRecommendation)=>{if(!selected.some(item=>item.id===recommendation.id))selected.push(recommendation)};
  // Rules are answer-linked educational prompts, not a clinical risk ranking.
  if(['sometimes_irregular','often_irregular'].includes(String(pick(answers,'meal_pattern'))))add(DIETARY_RECOMMENDATIONS.skip);
  if(['no','sometimes'].includes(String(pick(answers,'breakfast_pattern'))))add(DIETARY_RECOMMENDATIONS.breakfast);
  if(infrequent(pick(answers,'vegetable_frequency')))add(DIETARY_RECOMMENDATIONS.vegetables);
  if(infrequent(pick(answers,'pulse_frequency')))add(DIETARY_RECOMMENDATIONS.pulses);
  if(infrequent(pick(answers,'whole_fruit_frequency')))add(DIETARY_RECOMMENDATIONS.fruit);
  if(pick(answers,'cereal_choice')==='mostly_refined')add(DIETARY_RECOMMENDATIONS.wholeGrains);
  if(FREQUENT.includes(pick(answers,'sweet_drinks_frequency') as never))add(DIETARY_RECOMMENDATIONS.sweetDrinks);
  if(FREQUENT.includes(pick(answers,'added_sugar_frequency') as never))add(DIETARY_RECOMMENDATIONS.addedSugar);
  if(FREQUENT.includes(pick(answers,'fried_processed_frequency') as never)){
    add(DIETARY_RECOMMENDATIONS.fried);
    add(DIETARY_RECOMMENDATIONS.packaged);
  }
  if(often(pick(answers,'salt_habit')))add(DIETARY_RECOMMENDATIONS.salt);
  if(pick(answers,'water_habit')==='limited')add(DIETARY_RECOMMENDATIONS.water);
  if(participantStatus==='not-diagnosed'){
    // The prevention path uses the same shared questions; it makes no diagnosis assumption.
  }
  if(participantStatus==='diagnosed'&&pick(answers,'diet_guidance_difficulty')==='yes')add(DIETARY_RECOMMENDATIONS.individualGuidance);
  if(selected.length===0){
    const foodGroupIds=['vegetable_frequency','pulse_frequency','whole_fruit_frequency'];
    const hasRegularVariety=foodGroupIds.some(id=>often(pick(answers,id)));
    add(hasRegularVariety?DIETARY_RECOMMENDATIONS.patterns:DIETARY_RECOMMENDATIONS.general);
  }
  const generalEducation=[DIETARY_RECOMMENDATIONS.general,DIETARY_RECOMMENDATIONS.generalLabels,DIETARY_RECOMMENDATIONS.generalHydration];
  for(const item of generalEducation){if(selected.length>=3)break;add(item)}
  return selected;
}
export function initialDietaryPriorities(items:DietaryRecommendation[]):DietaryRecommendation[]{return items.slice(0,3)}
export function makeDietarySnapshot(answers:Record<string,DietaryAnswer>,language:'en'|'te',date=new Date().toISOString(),participantStatus:DietaryParticipantStatus='unknown'):DietarySnapshot{
  return {date,answers:structuredClone(answers),language,participantStatus,questionnaireVersion:DIETARY_QUESTIONNAIRE_VERSION,recommendationRulesVersion:DIETARY_RECOMMENDATION_RULES_VERSION,contentVersion:DIETARY_SOURCE_VERSION,reviewStatus:'pending_review',recommendations:structuredClone(generateDietaryRecommendations(answers,participantStatus)),sourceReferences:[structuredClone(ICMR_NIN_2024)]};
}
export function recommendationTranslationsComplete(items=Object.values(DIETARY_RECOMMENDATIONS)){return items.every(item=>Boolean(item.title.en&&item.title.te&&item.why.en&&item.why.te&&item.suggestion.en&&item.suggestion.te&&item.professionalCare.en&&item.professionalCare.te))}
export function articleForRecommendation(recommendation:DietaryRecommendation){return DIETARY_ARTICLES.find(article=>article.id===recommendation.articleId)}
