import { StyleSheet, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { VideoBadgeCard } from './VideoBadgeCard';
import { VideoBadgeLogoMark } from './VideoBadgeLogoMark';
import type { videoBadgeLayout } from './video-badge-layout';
import type { VideoBadgeInfo } from './types';

export function VideoBadgeOverlay({ info, expanded, onToggle, allowsExpansion = true, geometry }: {
  info: VideoBadgeInfo;
  expanded: boolean;
  onToggle: () => void;
  allowsExpansion?: boolean;
  /** The embedded workbench retains its centered, fixed-size logo. */
  geometry?: ReturnType<typeof videoBadgeLayout>;
}) {
  const isExpanded = allowsExpansion && expanded;
  const scale = geometry?.scale ?? 0;
  const content = isExpanded ? <VideoBadgeCard info={info} form="playback" scale={scale} />
    : <View style={styles.shadow}><VideoBadgeLogoMark size={Math.max(44, 61 * scale)} /></View>;
  const testID = isExpanded ? 'feedback.video.badge.expanded' : 'feedback.video.badge.collapsed';
  return <View pointerEvents="box-none" style={geometry
    ? { position: 'absolute', left: geometry.left, bottom: geometry.bottom }
    : styles.workbench}>
    {allowsExpansion ? <Pressable testID={testID} accessibilityRole="button"
      accessibilityLabel={t(isExpanded ? 'chat.videoBadge.collapse' : 'chat.videoBadge.expand')} onPress={onToggle}>{content}</Pressable>
      : <View testID={testID} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{content}</View>}
  </View>;
}
const styles = StyleSheet.create({
  workbench: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 13 },
  shadow: { shadowColor: 'black', shadowOpacity: 0.38, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 9 },
});
