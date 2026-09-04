import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import { useSubmitReadiness } from '@/api/domains/readiness';
import { AppButton, Card, useColors, type Colors, radius, spacing, typography } from '@/design';

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
        muscle_fatigue: Object.entries(fatigue).map(([muscle_group, severity]) => ({
          muscle_group,
          severity,
        })),
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
          <Pressable onPress={skip}><Text style={styles.skip}>{t('student.readinessCheckinSheet.copy002')}</Text></Pressable>
          <Text style={styles.title}>{t('coach.detail.todayStatus')} {step}/2</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.content}>
          {step === 1 ? (
            <>
              {questions().map(([key, question, low, high]) => (
                <Card key={key} style={styles.questionCard}>
                  <Text style={styles.question}>{question}</Text>
                  <View style={styles.scoreRow}>
                    {Array.from({ length: 5 }, (_, index) => index + 1).map((score) => (
                      <Pressable
                        accessibilityLabel={`${question} ${score}`}
                        key={score}
                        onPress={() => setScores((current) => ({ ...current, [key]: score }))}
                        style={[styles.score, scores[key] === score && styles.scoreSelected]}>
                        <Text style={[styles.scoreText, scores[key] === score && styles.scoreTextSelected]}>{score}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.ends}><Text style={styles.endText}>{low}</Text><Text style={styles.endText}>{high}</Text></View>
                </Card>
              ))}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton
                label={t('student.readinessCheckinSheet.copy016')}
                onPress={() => {
                  if (Object.values(scores).some((value) => value === null)) {
                    setError(t('student.readinessCheckinViewModel.copy001'));
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                variant="primary"
              />
            </>
          ) : (
            <>
              <Text style={styles.heading}>{t('student.readinessCheckinSheet.copy013')}</Text>
              <Text style={styles.help}>{t('student.readinessCheckinSheet.copy014')}</Text>
              <View style={styles.chips}>
                {READINESS_MUSCLES.map(([key, label]) => {
                  const severity = fatigue[key] ?? 0;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setFatigue((current) => {
                        const next = { ...current };
                        if (severity >= 3) delete next[key];
                        else next[key] = severity + 1;
                        return next;
                      })}
                      style={[styles.chip, severity > 0 && styles.chipSelected]}>
                      <Text style={[styles.chipText, severity > 0 && styles.chipTextSelected]}>
                        {t(label)}{severity > 0 ? ` · ${[t('coach.shared.severity.light'), t('coach.shared.severity.moderate'), t('coach.shared.severity.heavy')][severity - 1]}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.bottomActions}>
                <Pressable onPress={() => setStep(1)} style={styles.back}><Text style={styles.backText}>{t('student.readinessCheckinSheet.copy015')}</Text></Pressable>
                <AppButton disabled={submit.isPending} label={submit.isPending ? t('student.readinessCheckinSheet.copy017') : t('student.readinessCheckinSheet.copy018')} onPress={() => void complete()} style={styles.complete} variant="primary" />
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  root: { backgroundColor: colors.bgBase, flex: 1 },
  nav: { alignItems: 'center', borderBottomColor: colors.borderDefault, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.base },
  skip: { color: colors.textSecondary, width: 64, ...typography.body },
  title: { color: colors.textPrimary, flex: 1, textAlign: 'center', ...typography.bodyEmphasis },
  spacer: { width: 64 },
  content: { flex: 1, gap: spacing.md, padding: spacing.base },
  questionCard: { gap: spacing.md, padding: spacing.base },
  question: { color: colors.textPrimary, ...typography.bodyEmphasis },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  score: { alignItems: 'center', backgroundColor: colors.bgStack, borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 },
  scoreSelected: { backgroundColor: colors.success },
  scoreText: { color: colors.textSecondary, ...typography.bodyEmphasis },
  scoreTextSelected: { color: colors.textPrimary },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  endText: { color: colors.textTertiary, ...typography.caption },
  error: { color: colors.danger, textAlign: 'center', ...typography.footnote },
  heading: { color: colors.textPrimary, marginTop: spacing.lg, ...typography.title2 },
  help: { color: colors.textSecondary, lineHeight: 23, ...typography.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.bgInset, borderColor: colors.borderStrong, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  chipSelected: { backgroundColor: colors.successTint, borderColor: colors.success },
  chipText: { color: colors.textSecondary, ...typography.body },
  chipTextSelected: { color: colors.success },
  bottomActions: { flexDirection: 'row', gap: spacing.md, marginTop: 'auto' },
  back: { alignItems: 'center', borderColor: colors.textSecondary, borderRadius: radius.lg, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44 },
  backText: { color: colors.textSecondary, ...typography.bodyEmphasis },
  complete: { flex: 2 },
});
