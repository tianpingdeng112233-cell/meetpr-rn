import { Pressable, View } from 'react-native';
import { Card, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { relativeText } from '@/domain/coach/formatting';
import { makeSummary, type RosterRow } from '@/domain/coach/week-overview';
import { useCoachNow } from '../CoachNowProvider';
import { Copy, rowStyle } from '../ui';
import { completionColor, isAbnormal } from './roster-state';
export function StudentRosterRow({ row, onPress }: { row: RosterRow; onPress(): void }) {
  const now = useCoachNow();
  const colors = useColors();
  const week = makeSummary([row], now);
  const abnormal = isAbnormal(row);
  const missed = Math.max(0, ...row.triageSignals.map(signal => signal.kind === 'notTrained' ? signal.daysMissed : 0));
  const reason = missed ? t('coach.roster.notTrainedReason %lld', [missed]) : row.triageSignals.some(signal => signal.kind === 'awaitingReply') ? t('coach.roster.waitingForReplyReason') : t('coach.detail.needsAttention');
  return <Pressable accessibilityRole="button" accessibilityLabel={row.student.displayName} onPress={onPress} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}><Card style={{ gap: spacing.space3 }}>
    <View style={[rowStyle, { gap: spacing.space2 }]}><View style={{ width: 9, height: 9, borderRadius: radius.pill, backgroundColor: abnormal ? colors.danger : colors.success }} /><Copy size={16} weight="bold" lines={1} style={{ flex: 1 }}>{row.student.displayName}</Copy>
      {abnormal ? <Copy size={11} weight="semibold" tone="danger" lines={1} style={{ maxWidth: '55%' }}>{reason}</Copy> : <View style={[rowStyle, { gap: spacing.space2, flexShrink: 1 }]}><Copy mono size={11} tone="textTertiary" lines={1} style={{ flexShrink: 1 }}>{row.lastActiveAt ? relativeText(row.lastActiveAt, now) : t('coach.roster.noTrainingRecords')}</Copy>{!week.planned ? <View style={{ paddingHorizontal: spacing.space2, paddingVertical: spacing.point3, borderWidth: 1, borderColor: colors.coachNoPlanBorder, borderRadius: radius.pill }}><Copy size={11} tone="gold500">{t('coach.roster.noPlan')}</Copy></View> : null}</View>}
    </View>
    <View style={[rowStyle, { justifyContent: 'space-between', gap: spacing.space2 }]}><View style={{ flex: 1, gap: spacing.point5 }}>{week.planned ? <View style={[rowStyle, { gap: spacing.space1, flexWrap: 'wrap' }]}>{Array.from({ length: week.planned }, (_, index) => <View key={index} style={{ width: 16, height: 5, borderRadius: radius.pill, backgroundColor: index < week.completed ? colors.textPrimary : colors.borderDefault }} />)}</View> : null}<Copy mono size={11} tone="textTertiary">{t('coach.roster.weekProgress %lld %lld', [week.completed, week.planned])}</Copy></View><Copy size={11} tone="textTertiary">{t('coach.roster.completionRate')}</Copy><Copy mono size={14} weight="bold" tone={completionColor(week.completionRate)}>{week.completionRate}%</Copy></View>
  </Card></Pressable>;
}
