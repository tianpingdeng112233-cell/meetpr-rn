import { test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  decodePrescription,
  prescribed,
  prescriptionSummary,
  prescriptionRestRPE,
} from '../prescription';
import { set } from '../test-fixtures';
import { setLocaleOverride } from '@/i18n';
beforeEach(() => setLocaleOverride('en'));
afterEach(() => setLocaleOverride(null));
test.each([
  [{ load_mode: 'pct', target_pct: '72.5', pct_anchor: 'e1rm' }, '72.5% × 5'],
  [{ load_mode: 'rpe', target_rpe: '8' }, 'RPE 8 × 5'],
  [{ load_mode: 'rir', rir_target: 2 }, 'RIR 2 × 5'],
  [
    { load_mode: 'weight_range', weight_low: '165', weight_high: '175' },
    '165–175kg × 5',
  ],
  [{ load_mode: 'rpe_range', rpe_low: '8', rpe_high: '9' }, 'RPE 8–9 × 5'],
  [{ load_mode: 'fixed_weight', target_weight: '170' }, '170kg × 5'],
  [{ load_mode: 'rpe', target_rpe: '8', target_weight: '170' }, '170kg × 5 @8'],
  [{ load_mode: 'rpe' }, '× 5'],
  [{ intensity_mode: 'rpe', target_value: '8' }, 'RPE 8 × 5'],
  [{ intensity_mode: 'weight', target_value: '170' }, '170kg x 5'],
] as [Partial<import('@/api/domains/plans').PlanSet>, string][])(
  'faithfully decodes/formats %j without using its lossy projection',
  (fields, expected) => {
    const p = decodePrescription(set(fields));
    expect(prescribed(p)).toBe(expected);
    expect(prescribed(p)).not.toMatch(/-kg x|目标 RPE 0/);
  },
);
test('keeps percentage anchor and handles resolved percentage display', () => {
  const p = decodePrescription(
    set({ load_mode: 'pct', target_pct: '75', pct_anchor: 'registered_1rm' }),
  );
  expect(p).toMatchObject({
    intensity: { kind: 'pct', value: 75 },
    percentageAnchor: 'registered_1rm',
    loadMode: 'pct',
  });
  expect(
    prescribed(p, { resolvedKg: 150, source: 'registered_1rm', anchorKg: 200 }),
  ).toBe('≈ 150 kg · 75% · 1RM × 5');
});
test('rest uses RPE range lower bound; pct, rir and fixed take default', () => {
  expect(
    prescriptionRestRPE(
      set({ load_mode: 'rpe_range', rpe_low: '6', rpe_high: '9' }),
    ),
  ).toBe(6);
  for (const load_mode of ['pct', 'rir', 'fixed_weight'] as const)
    expect(
      prescriptionRestRPE(
        set({ load_mode, intensity_mode: 'rpe', target_value: '10' }),
      ),
    ).toBeNull();
});

test('action summaries name a uniform prescription and never misrepresent mixed sets', () => {
  const first = decodePrescription(
    set({ load_mode: 'fixed_weight', target_weight: '170' }),
  );
  const second = decodePrescription(set({ load_mode: 'rpe', target_rpe: '8' }));
  expect(
    prescriptionSummary([{ prescription: first }, { prescription: first }]),
  ).toBe('170kg × 5 · 2 sets');
  expect(
    prescriptionSummary([{ prescription: first }, { prescription: second }]),
  ).toBe('2 sets');
});
