export {EDUCATION_ARTICLES,EDUCATION_CATEGORIES,educationTopics,educationTopic,validateArticleCatalog} from '../content/articles';
export type EducationTopic=ReturnType<typeof import('../content/articles').educationTopics>[number];
export type EducationArticleView=NonNullable<ReturnType<typeof import('../content/articles').educationTopic>>;
