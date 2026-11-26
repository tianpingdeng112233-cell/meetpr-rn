import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { getLocaleHeader, t } from '@/i18n';
import { addDays, parseLocalDate } from './policy';

export function resumeDateLabel(date: string, today: string) {
  const year = date.slice(0, 4) !== today.slice(0, 4) ? 'numeric' : undefined;
  return parseLocalDate(date).toLocaleDateString(getLocaleHeader(), { year, month: 'short', day: 'numeric' });
}

export function SessionResumeSheet({ previous, lockedDate, today, code, recorded, total, busy, onContinue, onComplete }: {
  previous: string; lockedDate?: string; today: string; code: string; recorded: number; total: number; busy: boolean;
  onContinue: () => void; onComplete: (date: string) => void;
}) {
  const colors = useColors();
  const [choice, setDate] = useState(previous);
  const date = lockedDate ?? choice;
  const [expanded, setExpanded] = useState(false);
  const dates = useMemo(() => {
    const result: string[] = [];
    if (expanded) for (let d = previous; d <= today; d = addDays(d, 1)) result.push(d);
    return result;
  }, [expanded, previous, today]);
  const weekday = useMemo(() => new Intl.DateTimeFormat(getLocaleHeader(), { weekday: 'short' }), []);
  const dateLabel = resumeDateLabel(date, today);
  const editLabel = t(expanded ? 'training.resume.collapse' : 'training.resume.edit');
  const primary = t('training.resume.done', [dateLabel]);
  return <Modal transparent visible animationType="slide" onRequestClose={() => { if (!busy) onContinue(); }}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.numberPadScrim }}>
      <SafeAreaView edges={['bottom']} style={{ maxHeight: '90%', paddingHorizontal: spacing.base, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, backgroundColor: colors.surfaceCard }}>
        <View style={{ marginVertical: spacing.sm, height: 4, width: 36, borderRadius: 2, alignSelf: 'center', backgroundColor: colors.borderDefault }} />
        <ScrollView contentContainerStyle={{ paddingVertical: spacing.sm, gap: spacing.sm }}>
          <Text accessibilityRole="header" style={{ ...font.body(22, 'bold'), color: colors.textPrimary }}>{t('training.resume.title')}</Text>
          <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('training.resume.previous', [resumeDateLabel(previous, today)])}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderDefault }}>
            <Text style={{ ...font.body(14, 'bold'), color: colors.textPrimary }}>{code}</Text>
            <Text style={{ ...font.body(13), color: colors.textSecondary }}>{recorded ? t('training.resume.progress', [recorded, total]) : t('training.resume.none')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Text style={{ ...font.body(14), color: colors.textPrimary }}>{t('training.resume.date')}</Text>
            <Text style={{ ...font.body(14, 'bold'), color: colors.textPrimary }}>{dateLabel}</Text>
            {!lockedDate && <Pressable accessibilityRole="button" accessibilityLabel={editLabel} accessibilityState={{ expanded, disabled: busy }} disabled={busy}
              onPress={() => setExpanded(!expanded)} style={{ marginLeft: 'auto', paddingHorizontal: spacing.sm, minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
              <Text style={{ ...font.body(13), color: colors.goldText }}>{editLabel}</Text>
            </Pressable>}
          </View>
          {expanded && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 4 }}>
            {dates.map(value => {
              const label = resumeDateLabel(value, today);
              const hint = value === previous ? t('training.resume.opened') : value === today ? t('training.resume.today') : value === addDays(today, -1) ? t('training.resume.yesterday') : weekday.format(parseLocalDate(value));
              return <Pressable key={value} testID={`resume-date-${value}`} accessibilityRole="button" accessibilityLabel={`${label}, ${hint}`}
                accessibilityState={{ selected: value === date }} onPress={() => { setDate(value); setExpanded(false); }}
                style={{ width: '32%', minHeight: 54, alignItems: 'center', justifyContent: 'center', padding: 3, borderWidth: 1, borderRadius: radius.control, borderColor: value === date ? colors.gold500 : colors.borderDefault, backgroundColor: value === date ? colors.goldSoft : colors.bgBase }}>
                <Text style={{ ...font.body(14, 'semibold'), color: colors.textPrimary }}>{label}</Text><Text style={{ ...font.body(11), color: colors.textSecondary }}>{hint}</Text>
              </Pressable>;
            })}
          </View>}
          <Text style={{ ...font.body(12), color: colors.textSecondary }}>{t('training.resume.effect')}</Text>
        </ScrollView>
        <Pressable accessibilityRole="button" testID="resume-complete" disabled={busy} accessibilityState={{ disabled: busy, busy }} accessibilityLabel={primary} onPress={() => onComplete(date)}
          style={{ minHeight: spacing.completionControlHeight, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.holdTrack, opacity: busy ? 0.6 : 1 }}>
          <Text style={{ ...font.body(15, 'bold'), color: colors.inkOnCTAFill }}>{primary}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('training.resume.continue')} disabled={busy} onPress={onContinue} style={{ minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...font.body(14, 'semibold'), color: colors.textPrimary }}>{t('training.resume.continue')}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  </Modal>;
}

export function ResumeCompletionNotice({ message, onHide }: { message: string; onHide: () => void }) {
  const colors = useColors();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    opacity.setValue(1);
    const fade = Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true });
    const timer = setTimeout(() => fade.start(({ finished }) => { if (finished) onHide(); }), 5000);
    return () => { clearTimeout(timer); fade.stop(); };
  }, [message, onHide, opacity]);
  return <Animated.View accessibilityLiveRegion="polite" style={{ opacity, padding: spacing.sm, borderRadius: radius.control, backgroundColor: colors.goldSoft }}>
    <Text style={{ ...font.body(13), color: colors.textPrimary }}>{message}</Text>
  </Animated.View>;
}
