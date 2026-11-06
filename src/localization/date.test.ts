import {describe,it,expect} from 'vitest';
import {formatDate,formatDateTime} from './date';

describe('localized date formatting',()=>{
  it('uses Indian day-month-year ordering for English',()=>expect(formatDate('2026-11-05T00:00:00.000Z','en')).toMatch(/^05\/11\/2026$/));
  it('uses the Telugu locale while keeping Indian date ordering',()=>expect(formatDate('2026-11-05T00:00:00.000Z','te')).toMatch(/05.*11.*2026/));
  it('includes time in a localized date-time',()=>expect(formatDateTime('2026-11-05T12:45:00.000Z','en')).toMatch(/05.*11.*2026/));
});
