import { E1RM_MATH, RTS_INTENSITY_TABLE } from './constants';
import { POUNDS_PER_KG } from '@/domain/measurement';

export const RPE_TABLE_COLUMNS = Array.from({ length: RTS_INTENSITY_TABLE[0].length }, (_, index) => E1RM_MATH.maximumRPE - index * E1RM_MATH.rpeStep);
const LB_INCREMENT = 5;
export function rpeTable(e1rmKg: number | null, unit: 'kg' | 'lb'): string[][] {
  return RTS_INTENSITY_TABLE.map(row => [...row].reverse().map(intensity => {
    if (e1rmKg == null || !Number.isFinite(e1rmKg) || e1rmKg <= 0) return `${Math.round(intensity * 1000) / 10}%`;
    const increment = unit === 'lb' ? LB_INCREMENT : E1RM_MATH.suggestionIncrementKg;
    const load = e1rmKg * intensity * (unit === 'lb' ? POUNDS_PER_KG : 1);
    return String(Math.floor(load / increment + E1RM_MATH.floorCorrection) * increment);
  }));
}
