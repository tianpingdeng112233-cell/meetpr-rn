import { StyleSheet, Text, View } from 'react-native';

import { colors, Sparkline, spacing, typography } from '@/design';

import type { GrowthCurve } from './types';

export function E1RMChart({
  curve,
  height = 140,
}: {
  curve: GrowthCurve;
  height?: number;
}) {
  const trajectory = curve.trajectory.map((sample) => ({
    x: sample.date.getTime(),
    y: sample.valueKg,
  }));
  const lowConfidence = curve.lowConfidence.map((sample) => ({
    x: sample.date.getTime(),
    y: sample.valueKg,
  }));
  if (trajectory.length === 0 && lowConfidence.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>练几次就有趋势了</Text>
      </View>
    );
  }
  return (
    <View style={{ height }}>
      <Sparkline
        data={trajectory}
        height={height}
        lineColor={colors.brandRed}
        scatterData={lowConfidence}
        showPointDots
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.base },
  emptyText: { color: colors.fgTertiary, ...typography.footnote },
});
