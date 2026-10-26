import { useEffect, useState } from 'react';
import type { FirstPlan } from '@/api/domains/bind';
import { AnalyticsEvent, track } from '@/analytics';
import { Text, View } from 'react-native';
import { AppButton, Card, font, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';

export function NewStudentPlanWaitingState({ coachName, hasCompetitionDate, onMessage, onProfile, onCompetition }: {
  coachName: string; hasCompetitionDate: boolean; onMessage: () => void; onProfile: () => void; onCompetition: () => void;
}) {
  const colors = useColors();
  return <Card style={{ padding: 20, gap: 14 }}>
    <Text style={{ ...font.body(18, 'bold'), color: colors.textPrimary }}>{t('student.firstRun.waiting.title', [coachName])}</Text>
    <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('student.firstRun.waiting.detail')}</Text>
    <AppButton variant="secondary" label={t('student.firstRun.waiting.message')} style={{ minHeight: 46 }} onPress={onMessage} />
    <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />
    <Text style={{ ...font.body(12), color: colors.textSecondary }}>{t('student.firstRun.waiting.eyebrow')}</Text>
    {(['profile', 'meet'] as const).filter(kind => kind !== 'meet' || !hasCompetitionDate).map(kind =>
      <Pressable key={kind} accessibilityRole="button" accessibilityLabel={t(`student.firstRun.waiting.${kind}`)} onPress={kind === 'profile' ? onProfile : onCompetition} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ ...font.body(15, 'bold'), color: colors.textPrimary }}>{t(`student.firstRun.waiting.${kind}`)}</Text>
          <Text style={{ ...font.body(13), color: colors.textSecondary }}>{t(`student.firstRun.waiting.${kind}Detail`)}</Text>
        </View>
        <Text style={{ ...font.body(22), color: colors.textMuted }}>›</Text>
      </Pressable>)}
  </Card>;
}

export function FirstPlanCard({ coachName, plan, onDismiss, onStart }: {
  coachName: string; plan: FirstPlan; onDismiss: () => Promise<void>; onStart: () => Promise<void>;
}) {
  const colors = useColors();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { void track(AnalyticsEvent.FirstPlanViewed, { plan_id: plan.id }); }, [plan.id]);
  const close = async (start: boolean) => {
    if (start && !plan.day_count) return;
    setSaving(true);
    setFailed(false);
    try {
      if (start) await onStart();
      else await onDismiss();
      void track(start ? AnalyticsEvent.FirstPlanStart : AnalyticsEvent.FirstPlanDismiss, { plan_id: plan.id });
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };
  return <Card style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, gap: 12, borderWidth: 1.5, borderColor: colors.gold500, borderRadius: 18 }}>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={{ ...font.body(12), color: colors.goldText }}>{t('student.firstRun.plan.eyebrow')}</Text>
        <Text style={{ ...font.body(19, 'bold'), color: colors.textPrimary }}>{t('student.firstRun.plan.title', [coachName])}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.firstRun.plan.close')} disabled={saving} onPress={() => void close(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...font.body(24), color: colors.textSecondary }}>×</Text>
      </Pressable>
    </View>
    <Text style={{ ...font.mono(13), color: colors.textSecondary }}>{t('student.firstRun.plan.summary', [plan.plan_weeks, plan.day_count])}</Text>
    {failed ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{t('student.firstRun.saveError')}</Text> : null}
    <AppButton label={t('student.firstRun.plan.start')} icon="play" style={{ minHeight: 50 }} disabled={!plan.day_count} loading={saving} onPress={() => void close(true)} />
  </Card>;
}
