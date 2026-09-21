import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import { useSubmitReadiness } from '@/api/domains/readiness';
import { AppButton, useColors, type Colors, font, radius, spacing } from '@/design';

import { READINESS_MUSCLES, STORAGE_KEYS } from './constants';
import { writeBoolean } from './storage';

type Props = {
  date: string;
  studentId: string;
  onComplete: () => void;
  onSkip: () => void;
};

type Scores = { sleep: number | null; mood: number | null; stress: number | null };

const questions = () => [
  ['sleep', t('student.readinessCheckinSheet.copy003'), t('student.readinessCheckinSheet.copy004'), t('student.readinessCheckinSheet.copy005')],
  ['mood', t('student.readinessCheckinSheet.copy006'), t('student.readinessCheckinSheet.copy007'), t('student.readinessCheckinSheet.copy008')],
  ['stress', t('student.readinessCheckinSheet.copy009'), t('student.readinessCheckinSheet.copy010'), t('student.readinessCheckinSheet.copy011')],
] as const;

export function ReadinessSheet({ date, onComplete, onSkip, studentId }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const submit = useSubmitReadiness();
  const [step, setStep] = useState<1 | 2>(1);
  const [scores, setScores] = useState<Scores>({ sleep: null, mood: null, stress: null });
  const [fatigue, setFatigue] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [gridWidth, setGridWidth] = useState(0);
  const columns = Math.max(1, Math.floor((gridWidth + spacing.xs) / (92 + spacing.xs)));
  const chipWidth = gridWidth > 0 ? (gridWidth - (columns - 1) * spacing.xs) / columns : 92;

  const skip = () => {
    void writeBoolean(STORAGE_KEYS.readinessSkip(studentId, date), true);
    void track(AnalyticsEvent.FlowCancel, { flow: 'readiness', step });
    onSkip();
  };
  const complete = async () => {
    if (scores.sleep === null || scores.mood === null || scores.stress === null) {
      setError(t('student.readinessCheckinViewModel.copy001'));
      setStep(1);
      return;
    }
    setError('');
    try {
      await submit.mutateAsync({
        checkin_date: date,
        sleep_quality: scores.sleep,
        mood: scores.mood,
        stress: scores.stress,
        muscle_fatigue: READINESS_MUSCLES.flatMap(([muscle_group]) => {
          const severity = fatigue[muscle_group];
          return severity ? [{ muscle_group, severity }] : [];
        }),
      });
      onComplete();
    } catch {
      setError(t('student.readinessCheckinViewModel.copy002'));
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={() => undefined} visible>
      <SafeAreaView style={styles.root}>
        <View style={styles.nav}>
          <Pressable accessibilityRole="button" onPress={skip} style={styles.navSide}>
            <Text style={styles.skip}>{t('student.readinessCheckinSheet.copy002')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('student.readinessCheckinSheet.copy001', [step])}</Text>
          <View style={styles.navSide} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {step === 1 ? (
            <View style={styles.questions}>
              {questions().map(([key, question, low, high]) => (
                <View key={key} style={styles.scale}>
                  <Text style={styles.question}>{question}</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.anchor}>{low}</Text>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('student.readinessCheckinSheet.copy012', [question, score])}
                        accessibilityState={{ selected: scores[key] === score }}
                        key={score}
                        onPress={() => setScores((current) => ({ ...current, [key]: score }))}
                        style={[
                          styles.score,
                          (scores[key] ?? 0) >= score && styles.scoreFilled,
                          scores[key] === score && styles.scoreSelected,
                        ]}
                      />
                    ))}
                    <Text style={[styles.anchor, styles.highAnchor]}>{high}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.stepTwo}>
              <Text style={styles.question}>{t('student.readinessCheckinSheet.copy013')}</Text>
              <Text style={styles.help}>{t('student.readinessCheckinSheet.copy014')}</Text>
              <View style={styles.chips} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
                {READINESS_MUSCLES.map(([key, label]) => {
                  const severity = fatigue[key] ?? 0;
                  const selected = severity > 0;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('student.readinessCheckinSheet.copy019', [t(label), severity])}
                      accessibilityState={{ selected }}
                      key={key}
                      onPress={() => setFatigue((current) => {
                        const next = { ...current };
                        const level = ((current[key] ?? 0) + 1) % 4;
                        if (level === 0) delete next[key];
                        else next[key] = level;
                        return next;
                      })}
                      style={[styles.chip, { width: chipWidth }, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t(label)}</Text>
                      <Text style={[styles.severity, selected && styles.chipTextSelected]}>
                        {severity > 0 ? '·'.repeat(severity) : ' '}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {error ? (
                <View accessibilityRole="alert" style={styles.errorRow}>
                  <MaterialCommunityIcons name="alert-outline" size={14} color={colors.dangerMuted} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          {step === 2 ? (
            <AppButton haptic="none" fullWidth={false} label={t('student.readinessCheckinSheet.copy015')} onPress={() => setStep(1)} variant="secondary" />
          ) : null}
          <View style={styles.footerSpacer} />
          {step === 1 ? (
            <AppButton haptic="none"
              disabled={Object.values(scores).some((value) => value === null)}
              fullWidth={false}
              label={t('student.readinessCheckinSheet.copy016')}
              onPress={() => {
                setError('');
                setStep(2);
              }}
              variant="primary"
            />
          ) : (
            <AppButton
              disabled={submit.isPending}
              fullWidth={false}
              label={submit.isPending ? t('student.readinessCheckinSheet.copy017') : t('student.readinessCheckinSheet.copy018')}
              loading={submit.isPending}
              onPress={() => void complete()}
              variant="primary"
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  root: { backgroundColor: colors.bgBase, flex: 1 },
  nav: { alignItems: 'center', flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.md },
  navSide: { width: 56 },
  skip: { color: colors.textMuted, ...font.body(17) },
  title: { color: colors.textPrimary, flex: 1, textAlign: 'center', ...font.body(17, 'semibold') },
  scroll: { flex: 1 },
  content: { gap: spacing.lg, padding: spacing.md },
  questions: { gap: spacing.lg },
  scale: { gap: spacing.xs },
  question: { color: colors.textPrimary, ...font.body(17, 'semibold') },
  scoreRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  score: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, height: 30, width: 30 },
  scoreFilled: { backgroundColor: colors.gold500 },
  scoreSelected: { borderColor: colors.bgBase, borderWidth: 2 },
  anchor: { color: colors.textMuted, width: 56, ...font.body(11, 'medium') },
  highAnchor: { textAlign: 'right' },
  stepTwo: { gap: spacing.md },
  help: { color: colors.textSecondary, ...font.body(13) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { alignItems: 'center', gap: 2, minWidth: 92, backgroundColor: colors.surfaceCard, borderColor: colors.borderDefault, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: `${colors.gold500}1F`, borderColor: `${colors.gold500}66` },
  chipText: { color: colors.textMuted, textAlign: 'center', ...font.body(13) },
  severity: { color: colors.textMuted, ...font.mono(12, 'semibold') },
  chipTextSelected: { color: colors.goldText },
  errorRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.dangerMuted, flex: 1, ...font.body(13) },
  footer: { alignItems: 'center', backgroundColor: colors.bgBase, flexDirection: 'row', padding: spacing.md },
  footerSpacer: { flex: 1 },
});
