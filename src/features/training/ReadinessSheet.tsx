import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const QUESTIONS = [
  ['sleep', '昨晚睡得怎么样?', '很差', '很好'],
  ['mood', '今天状态如何?', '很糟', '很棒'],
  ['stress', '今天压力大吗?', '压力爆表', '很轻松'],
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
      setError('请先完成三项状态评分');
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
      setError('提交失败,请重试');
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={() => undefined} visible>
      <SafeAreaView style={styles.root}>
        <View style={styles.nav}>
          <Pressable onPress={skip}><Text style={styles.skip}>跳过</Text></Pressable>
          <Text style={styles.title}>今日状态 {step}/2</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.content}>
          {step === 1 ? (
            <>
              {QUESTIONS.map(([key, question, low, high]) => (
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
                label="下一步"
                onPress={() => {
                  if (Object.values(scores).some((value) => value === null)) {
                    setError('请先完成三项状态评分');
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
              <Text style={styles.heading}>今天哪些肌群还累?</Text>
              <Text style={styles.help}>点一下:轻 → 中 → 重 → 取消。不累可以直接完成。</Text>
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
                        {label}{severity > 0 ? ` · ${['轻', '中', '重'][severity - 1]}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.bottomActions}>
                <Pressable onPress={() => setStep(1)} style={styles.back}><Text style={styles.backText}>上一步</Text></Pressable>
                <AppButton disabled={submit.isPending} label={submit.isPending ? '提交中…' : '完成'} onPress={() => void complete()} style={styles.complete} variant="primary" />
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
