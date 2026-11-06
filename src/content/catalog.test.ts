import {describe,it,expect} from 'vitest';
import {EDUCATION_ARTICLES,EDUCATION_CATEGORIES,validateArticleCatalog} from './articles';
import {HEALTH_RECOMMENDATIONS,MOVEMENT_RECOMMENDATIONS} from './recommendations';

describe('localized education content catalogue',()=>{
 it('includes the required everyday categories and learn-about-diabetes section',()=>{
  expect(EDUCATION_CATEGORIES.map(category=>category.id)).toEqual(expect.arrayContaining(['healthy-eating','physical-activity','sleep-routine','body-measurements','preventive-screening','diabetes-awareness','learn-diabetes']));
  const articleIds=new Set(EDUCATION_ARTICLES.map(article=>article.id));
  for(const required of ['food-balanced','food-carbohydrates','food-fibre','activity-benefits','activity-routine','activity-sitting','routine-sleep','routine-daily','measurements-bmi-waist','measurements-waist','screening-blood-glucose','awareness-type-2','learn-diabetes','learn-type1-type2','learn-insulin','learn-glucose','learn-prediabetes','learn-idrs','learn-idrs-diagnose','learn-idrs-bmi','learn-hba1c','learn-fpg'])expect(articleIds.has(required)).toBe(true);
 });
 it('provides versioned, bilingual, sourced content with only pending review status',()=>{
  expect(validateArticleCatalog()).toBe(true);
  for(const article of EDUCATION_ARTICLES){
   expect(article.version).toContain('draft');expect(article.reviewStatus).toBe('pending_review');
   expect(article.title.en).not.toBe('');expect(article.title.te).not.toBe('');
   expect(article.introduction.en).not.toBe('');expect(article.introduction.te).not.toBe('');
   expect(article.sections.length).toBeGreaterThanOrEqual(2);expect(article.keyTakeaways.length).toBeGreaterThan(0);
   expect(article.sources.length).toBeGreaterThan(0);
   for(const section of article.sections){expect(section.heading.en).not.toBe('');expect(section.heading.te).not.toBe('');expect(section.content.en).not.toBe('');expect(section.content.te).not.toBe('')}
  }
 });
 it('keeps every recommendation article link valid and medical review pending',()=>{
  const all=[...HEALTH_RECOMMENDATIONS,...Object.values(MOVEMENT_RECOMMENDATIONS)];const ids=new Set(EDUCATION_ARTICLES.map(article=>article.id));
  for(const item of all){expect(item.reviewStatus).toBe('pending_review');expect(item.version).toBeTruthy();expect(item.sources.length).toBeGreaterThan(0);expect(item.linkedArticleIds.every(id=>ids.has(id))).toBe(true);expect(item.title.en).not.toBe('');expect(item.title.te).not.toBe('')}
 });
});
