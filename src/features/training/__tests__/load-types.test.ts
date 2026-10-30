import { expect, test } from '@jest/globals';
import { decodePrescription, prescribed } from '@/domain/plan/prescription';
import { set } from '@/domain/plan/test-fixtures';
import { setLocaleOverride } from '@/i18n';
import { entryPrefill } from '../suggestion-gating';

test.each(['free_weight', 'bodyweight'] as const)('056 %s displays RPE, RIR and percentage separately from load', load_mode => {
  setLocaleOverride('zh');
  for (const [target, intensity] of [
    [{ target_rpe: '8' }, { kind: 'rpe', value: 8 }],
    [{ rir_target: 2 }, { kind: 'rir', value: 2 }],
    [{ target_pct: '75' }, { kind: 'pct', value: 75 }],
  ] as const) {
    const planSet = set({ load_mode, intensity_mode: null, target_value: null, ...target });
    const p = decodePrescription(planSet);
    expect(p.intensity).toEqual(intensity);
    expect(p.weightKg).toBeUndefined();
    expect(prescribed(p)).toContain(load_mode === 'bodyweight' ? '自重' : '自选重量');
    expect(entryPrefill(planSet, null, { weightKg: 80, label: 'Suggestion' }, true)).toBe('');
  }
  setLocaleOverride(null);
});

test('056 legacy bodyweight hides the marker, while an explicit load mode wins', () => {
  expect(decodePrescription(set({ coach_note: '自重', intensity_mode: 'rpe', target_value: '10' })).loadMode).toBe('bodyweight');
  expect(decodePrescription(set({ coach_note: '自重', load_mode: 'free_weight' })).loadMode).toBe('free_weight');
});
