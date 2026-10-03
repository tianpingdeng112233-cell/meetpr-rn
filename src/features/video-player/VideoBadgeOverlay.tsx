import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { VideoBadgeCard } from './VideoBadgeCard';
import { VideoBadgeLogoMark } from './VideoBadgeLogoMark';
import type { VideoBadgeInfo } from './types';

export function VideoBadgeOverlay({ info, expanded, onToggle, allowsExpansion = true }: {
  info: VideoBadgeInfo;
  expanded: boolean;
  onToggle: () => void;
  allowsExpansion?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const isExpanded = allowsExpansion && expanded;
  const content = isExpanded ? (width > 0 ? <VideoBadgeCard info={info} width={width * 468 / 540} includesCoachAttribution={false} /> : null)
    : <View style={styles.shadow}><VideoBadgeLogoMark size={44} /></View>;
  const testID = isExpanded ? 'feedback.video.badge.expanded' : 'feedback.video.badge.collapsed';
  return <View pointerEvents="box-none" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.region}>
    {allowsExpansion ? <Pressable testID={testID} accessibilityRole="button"
      accessibilityLabel={t(isExpanded ? 'chat.videoBadge.collapse' : 'chat.videoBadge.expand')} onPress={onToggle}>{content}</Pressable>
      : <View testID={testID} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{content}</View>}
  </View>;
}
const styles = StyleSheet.create({
  region: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 13 },
  shadow: { shadowColor: 'black', shadowOpacity: 0.38, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 9 },
});
