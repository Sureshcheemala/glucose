import {describe,expect,it} from 'vitest';
import {copy} from './AssessmentCenter';

describe('unified assessment detail translations',()=>{
  it('provides explicit English module and combined-summary states',()=>{
    expect(copy.en.moduleCompleted).toBe('Completed');
    expect(copy.en.modulePending).toBe('Pending');
    expect(copy.en.combinedAvailable).toBe('Available');
    expect(copy.en.combinedUnavailable).toBe('Not available');
    expect(copy.en.bothAssessmentsReady).toBe('Both assessments have been completed. Review your combined summary and mark this session complete when ready.');
  });

  it('provides equivalent Telugu status and care-plan wording',()=>{
    expect(copy.te.moduleCompleted).toBe('పూర్తయింది');
    expect(copy.te.modulePending).toBe('పెండింగ్‌లో ఉంది');
    expect(copy.te.combinedAvailable).toBe('అందుబాటులో ఉంది');
    expect(copy.te.combinedUnavailable).toBe('అందుబాటులో లేదు');
    expect(copy.te.bothAssessmentsReady).toContain('రెండు అంచనాలూ పూర్తయ్యాయి');
    expect(copy.te.mealPlanNotice).toContain('ప్రత్యామ్నాయం కాదు');
  });
});
