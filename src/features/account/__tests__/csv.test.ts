import { expect, test } from '@jest/globals';
import type { SetLog } from '@/api/domains/sets';
import { csvField, csvFileName, trainingLogCSV } from '../csv';
test('CSV header matches TrainingLogCSVExporter verbatim', () => {
  expect(trainingLogCSV([], new Map())).toBe('date,exercise,exercise_en,set_index,weight_kg,reps,rpe,completed,failed,adhoc');
});
test.each([['plain','plain'], ['a,b','"a,b"'], ['a"b','"a""b"'], ['a\nb','"a\nb"'], ['a\rb','"a\rb"']])('escapes %s', (input, output) => {
  expect(csvField(input)).toBe(output);
});
test('date and filename use device calendar, not UTC or logged_date gym-day', () => {
  const local = new Date(2026, 8, 5, 0, 30);
  const log = { logged_at: local.toISOString(), logged_date: '2026-09-04', exercise_id: 'lift', set_index: 1, weight_kg: '100.50', reps: 5, rpe: null, completed: true, failed: false, adhoc: true } as SetLog;
  expect(trainingLogCSV([log], new Map([['lift', { name: 'Squat, paused', name_en: 'Squat' }]]))).toContain('\n2026-09-05,"Squat, paused",Squat,1,100.50,5,,true,false,true');
  expect(csvFileName(local)).toBe('meetpr-training-log-20260905.csv');
});
