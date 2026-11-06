import {describe,it,expect} from 'vitest';
import {compareHistory,createHistoryRecord} from './db';
import {calculateIDRS} from '../idrs/scoring';
import {createRecommendationSnapshot} from '../recommendations/engine';

const first=calculateIDRS({age:34,sex:'female',waist:79,activity:'vigorous',parents:'neither'});
const second=calculateIDRS({age:35,sex:'female',waist:80,activity:'mild',parents:'one'});
const third=calculateIDRS({age:36,sex:'male',waist:92,activity:'moderate',parents:'one'});

describe('historical comparisons',()=>{
  it('keeps both dates, answers, and factor contributions in a comparison',()=>{
    const comparison=compareHistory(second,first);
    expect(comparison.previousDate).toBe(first.date);
    expect(comparison.currentDate).toBe(second.date);
    expect(comparison.previousTotal).toBe(0);
    expect(comparison.currentTotal).toBe(60);
    expect(comparison.scoreChange).toBe(60);
    expect(comparison.factors.map(item=>item.currentScore-item.previousScore)).toEqual([20,10,20,10]);
    expect(comparison.factors.map(item=>item.answerChanged)).toEqual([true,true,true,true]);
    expect(comparison.factors[0].previousAnswer).toBe('34');
    expect(comparison.factors[0].currentAnswer).toBe('35');
    expect(comparison.factors[1].previousAnswer).toBe('female:79');
    expect(comparison.factors[1].currentAnswer).toBe('female:80');
  });
  it('compares a sequence of three records independently and exposes an age-band change',()=>{
    const fromFirstToSecond=compareHistory(second,first);
    const fromSecondToThird=compareHistory(third,second);
    expect(fromFirstToSecond.scoreChange).toBe(60);
    expect(fromSecondToThird.scoreChange).toBe(-10);
    expect(fromSecondToThird.factors[0].answerChanged).toBe(true);
    expect(fromSecondToThird.factors[0].scoreChanged).toBe(false);
    expect(fromSecondToThird.factors[1].answerChanged).toBe(true);
  });
  it('stores and reopens the exact recommendation snapshot without regenerating it',()=>{
    const source=createRecommendationSnapshot(first,'en','2026-10-01T00:00:00.000Z');
    const saved=createHistoryRecord(first,source);
    const reopened=JSON.parse(JSON.stringify(saved));
    expect(reopened.recommendationSnapshot).toEqual(source);
    expect(reopened.recommendationSnapshot.language).toBe('en');
    expect(reopened.recommendationSnapshot.items[0].title).toBe(source.items[0].title);
    expect(reopened.recommendationSnapshot.items.find((item:{id:string})=>item.id.startsWith('movement-'))?.title).toBe(source.items.find(item=>item.id.startsWith('movement-'))?.title);
    expect(reopened.recommendationSnapshot.items.find((item:{id:string})=>item.id.startsWith('movement-'))?.section).toBe('priority');
    expect(reopened.recommendationSnapshot.screeningDate).toBe(first.date);
    expect(reopened.recommendationSnapshot.score).toBe(first.total);
    const future=createRecommendationSnapshot(first,'te','2026-11-01T00:00:00.000Z');
    expect(saved.recommendationSnapshot).toEqual(source);
    expect(future.items[0].title).not.toBe(source.items[0].title);
  });
});
