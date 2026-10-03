/** iOS beta/1.0-22 Motion.swift / RollUpCollapse.swift. */
export const rewardTiming = { bloom: 750, stamp: 520, spark: 800, stagger: 18, roll: 620, shimmer: 4500 } as const;
export const rollUpFrames = { progress: [0, 0.3, 0.62, 1], rotation: ['0deg', '-26deg', '-52deg', '-78deg'], scale: [1, 0.82, 0.48, 0.06], opacity: [1, 0.92, 0.6, 0] };
export function sparkGeometry(index: number) {
  return { angle: index / 18 * 2 * Math.PI + index % 3 * 0.35, radius: 66 + index % 4 * 24, size: 3 + index % 3, delay: index % 6 * rewardTiming.stagger };
}
