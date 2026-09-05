import { StyleSheet, View } from 'react-native';
import { GradientFill } from '@/design/GradientFill';
import { VideoBadgePalette } from './badge-palette';

export function VideoBadgeScrim() {
  return <View testID="feedback.video.badge.scrim" pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.scrim}>
    <GradientFill direction="vertical" stops={[
      { color: VideoBadgePalette.scrim, offset: 0, opacity: 0 },
      { color: VideoBadgePalette.scrim, offset: 1, opacity: 0.72 },
    ]} />
  </View>;
}
const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%' },
});
