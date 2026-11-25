import { test, expect } from '@jest/globals';
import cases from '../../../../specs/114-cycle-outlook/cycle-outlook-cases.json';
import { cycleOutlookRow, type OutlookWeek } from '../cycle-outlook';

const copy = { approximate: '约', skipped: '没做', unscheduled: '未排', notTrained: '没练' };

test.each(cases.cases)('$name', fixture => {
  for (const lift of fixture.lifts) {
    const actual = cycleOutlookRow(lift.input.weeks as OutlookWeek[], {
      ...lift.input, currentWeekIndex: fixture.currentWeekIndex, unit: 'kg', copy,
    });
    lift.expected.forEach((expected, index) => {
      const { ratio, ...fields } = expected as typeof expected & { ratio?: number };
      expect(actual[index]).toMatchObject(fields);
      if (ratio !== undefined) expect(Math.abs(actual[index].ratio! - ratio)).toBeLessThanOrEqual(0.01);
    });
  }
});
