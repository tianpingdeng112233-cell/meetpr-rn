import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { FeedbackItem } from '@/api/domains';
import { Card, font, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import { feedbackLabel, type DashboardFeedbackItem } from './model';

type FeedbackCardProps = {
  coachName: string;
  items: DashboardFeedbackItem[];
  pending: number;
  now: Date;
  onPress: () => void;
  onOpenItem: (item: FeedbackItem) => void;
};

export function FeedbackCard({ items, pending, onOpenItem }: FeedbackCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const orderedItems = [...items].sort((left, right) =>
    new Date(right.posted_at).getTime() - new Date(left.posted_at).getTime());
  const latest = orderedItems.find(item => item.read_at === null) ?? orderedItems[0];
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.gold500 }} />
      <Text style={{ ...font.body(13, 'bold'), color: colors.textPrimary }}>{t('student.dashboardFeedbackCard.copy003')}</Text>
      {pending > 0 ? <Text style={{ ...font.mono(10, 'bold'), color: colors.inkOnGold, backgroundColor: colors.goldText, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1 }}>{t('student.dashboardFeedbackCard.copy004', [pending])}</Text> : null}
      {expanded && latest ? <>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('student.dashboardFeedbackCard.copy005')}</Text>
          <MaterialCommunityIcons name="chevron-up" size={13} color={colors.textMuted} />
        </View>
      </> : latest ? <Text style={{ ...font.body(12), color: colors.textFaint }}>· {new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }).format(new Date(latest.day_date ?? latest.posted_at))}</Text> : null}
    </View>
  );

  if (!latest) {
    return (
      <Card accent style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 7, borderRadius: 12, overflow: 'hidden' }}>
        {header}
        <Text style={{ color: colors.textMuted }}>{t('student.dashboardFeedbackCard.copy007')}</Text>
      </Card>
    );
  }

  if (expanded) {
    return (
      <View style={{ paddingHorizontal: 15, paddingBottom: 4, backgroundColor: colors.surfaceCard, borderRadius: 12, overflow: 'hidden' }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: true }} onPress={() => setExpanded(false)} style={{ paddingVertical: 13, minHeight: 44 }}>
          {header}
        </Pressable>
        {orderedItems.map(item => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => onOpenItem(item)} style={{ paddingVertical: 10, gap: 3, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text numberOfLines={1} style={{ ...font.body(13, 'semibold'), color: colors.textSecondary, flexShrink: 1 }}>{feedbackLabel(item)}</Text>
              {item.read_at === null ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold500 }} /> : null}
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('student.dashboardFeedbackCard.copy006')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={12} color={colors.textMuted} />
              </View>
            </View>
            <Text numberOfLines={1} style={{ ...font.body(13), color: colors.textSecondary }}>{item.text}</Text>
          </Pressable>
        ))}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: colors.gold500 }} />
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: false }}
      accessibilityLabel={t('student.dashboardFeedbackCard.copy002', [items.length])}
      onPress={() => setExpanded(true)}
      style={{ paddingBottom: 11 }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 11, bottom: 0, left: 14, right: 14, borderRadius: 12, backgroundColor: colors.bgInset, borderWidth: 1, borderColor: colors.surfaceKey }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 5, bottom: 6, left: 7, right: 7, borderRadius: 12, backgroundColor: colors.bgStack, borderWidth: 1, borderColor: colors.surfaceKey }} />
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surfaceCard, borderRadius: 12, overflow: 'hidden' }}>
        {header}
        <Text numberOfLines={2} style={{ ...font.body(14), color: colors.textPrimary, lineHeight: 18, marginTop: 7 }}>{latest.text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 }}>
          <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('student.dashboardFeedbackCard.copy001', [items.length])}</Text>
          <MaterialCommunityIcons name="chevron-down" size={13} color={colors.textMuted} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: colors.gold500 }} />
      </View>
    </Pressable>
  );
}
