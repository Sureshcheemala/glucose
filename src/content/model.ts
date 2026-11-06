export type ReviewStatus='draft'|'pending_review'|'approved'|'retired';
export type LocalizedText={en:string;te:string};
export interface SourceReference{id:string;title:string;organization?:string;url?:string;publicationYear?:number;accessedAt?:string}
export interface ArticleSection{heading:LocalizedText;content:LocalizedText;examples?:LocalizedText[];misconception?:LocalizedText}
export interface EducationArticle{
 id:string;category:string;title:LocalizedText;introduction:LocalizedText;sections:ArticleSection[];
 keyTakeaways:LocalizedText[];linkedArticles:string[];sources:SourceReference[];version:string;reviewStatus:ReviewStatus;
}
export interface RecommendationTrigger{factor:string;condition:string}
export interface HealthRecommendation{
 id:string;category:string;triggers:RecommendationTrigger[];title:LocalizedText;whyItMatters:LocalizedText;
 practicalSuggestions:LocalizedText[];modifiability:'modifiable'|'non_modifiable'|'contextual';linkedArticleIds:string[];
 sources:SourceReference[];version:string;reviewStatus:ReviewStatus;
}
export type RecommendationSection='overall'|'priority'|'general';
export interface DisplayedRecommendation extends Omit<HealthRecommendation,'title'|'whyItMatters'|'practicalSuggestions'>{
 title:string;whyItMatters:string;practicalSuggestions:string[];section:RecommendationSection;
}
export interface RecommendationSnapshotItem extends DisplayedRecommendation{}
export interface SavedScreeningSnapshot{
 screeningId?:number|string;screeningDate:string;createdAt:string;language:'en'|'te';score:number;category:string;
 answers:Record<string,string|number>;factorScores:Record<string,number>;overallGuidance:RecommendationSnapshotItem;
 selectedRecommendationIds:string[];initialDisplayIds:string[];items:RecommendationSnapshotItem[];
 contentVersion:string;reviewStatus:ReviewStatus;sources:SourceReference[];
}
