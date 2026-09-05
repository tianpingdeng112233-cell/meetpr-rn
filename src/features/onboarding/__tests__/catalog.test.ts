import { describe, expect, test } from '@jest/globals';

import { equipmentLabel, prefillEquipment } from '../catalog';

describe('Appendix B equipment catalog', () => {
  test('prefillEquipment home_with_rack contains its complete catalog in order', () => {
    expect(prefillEquipment('home_with_rack')).toEqual([
      'barbell_dumbbell', 'squat_bench_rack', 'pullup_bar', 'db_max_20',
    ]);
  });

  test('prefillEquipment professional includes every powerlifting item', () => {
    expect(prefillEquipment('professional')).toEqual([
      'barbell_dumbbell', 'squat_bench_rack', 'pullup_bar', 'db_max_40',
      'cable_crossover', 'lat_pulldown', 'leg_press_machine', 'leg_curl_extension',
      'seated_row', 'landmine', 'seal_row', 'hack_squat',
      'power_bar_stiff', 'deadlift_bar', 'safety_bar', 'fractional_plates',
      'lifting_platform', 'rack_pins_blocks', 'chains_bands', 'ghr', 'belt_squat',
    ]);
  });

  test('equipmentLabel preserves unknown legacy tokens', () => {
    expect(equipmentLabel('heavy_dumbbells')).toBe('heavy_dumbbells');
  });
});
