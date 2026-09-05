import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { t } from '@/i18n';
import { AppButton, Card, useColors, type Colors, font, radius, spacing, typography } from '@/design';

import { STORAGE_KEYS, TRAINING_LIMITS } from './constants';
import { readBoolean, writeBoolean } from './storage';

type Props = {
  durationSeconds: number | null;
  studentId: string;
  onClose: () => void;
};

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimer({ durationSeconds, onClose, studentId }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [remaining, setRemaining] = useState(durationSeconds ?? 0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [endAt, setEndAt] = useState(
    () => Date.now() + (durationSeconds ?? 0) * 1_000,
  );
  const finished = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  useEffect(() => {
    if (durationSeconds === null) return;
    void readBoolean(STORAGE_KEYS.restExplanation(studentId)).then((seen) => {
      if (!seen) setShowExplanation(true);
    });
  }, [durationSeconds, studentId]);

  useEffect(() => {
    if (durationSeconds === null || showExplanation) return;
    const update = () => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1_000));
      setRemaining(next);
      if (next === 0 && !finished.current) {
        finished.current = true;
        Vibration.vibrate(80);
        dismissTimer.current = setTimeout(onClose, TRAINING_LIMITS.transientBannerMs);
      }
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [durationSeconds, endAt, onClose, showExplanation]);

  if (durationSeconds === null) return null;
  const progress = Math.max(0, Math.min(1, remaining / Math.max(1, durationSeconds)));

  const adjust = (delta: number) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    const current = Math.max(0, Math.ceil((endAt - Date.now()) / 1_000));
    const next = Math.max(
      0,
      Math.min(TRAINING_LIMITS.restMaximumSeconds, current + delta),
    );
    setEndAt(Date.now() + next * 1_000);
    finished.current = false;
    setRemaining(next);
  };

  return (
    <>
      <View style={styles.overlay}>
        {remaining > 0 ? (
          <View accessibilityLabel={t('student.restTimerOverlay.copy002', [formatClock(remaining)])}>
            <View style={styles.timerRow}>
              <MaterialCommunityIcons color={colors.gold500} name="timer-outline" size={22} />
              <Text style={styles.clock} accessibilityLabel={t('student.restTimerOverlay.copy002', [formatClock(remaining)])}>{formatClock(remaining)}</Text>
              <View style={styles.spacer} />
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="-30s" onPress={() => adjust(-30)} style={styles.action}><Text style={styles.actionText}>-30s</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t('student.restTimerOverlay.copy001')} onPress={onClose} style={styles.action}><Text style={styles.skipText}>{t('student.restTimerOverlay.copy001')}</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="+30s" onPress={() => adjust(30)} style={styles.action}><Text style={styles.actionText}>+30s</Text></Pressable>
              </View>
            </View>
            <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 1, now: progress }}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        ) : <Text style={styles.finished}>{t('student.restTimerOverlay.copy003')}</Text>}
      </View>
      <Modal
        animationType="slide"
        onRequestClose={() => undefined}
        transparent
        visible={showExplanation}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.explanation}>
            <Text style={styles.explanationTitle}>{t('student.restTimerExplanationView.copy001')}</Text>
            <Text style={styles.explanationText}>{t('student.restTimerExplanationView.copy002')}</Text>
            <Text style={styles.explanationText}>{t('student.restTimerExplanationView.copy003')}</Text>
            <Text style={styles.explanationText}>{t('student.restTimerExplanationView.copy004')}</Text>
            <AppButton
              label={t('student.restTimerExplanationView.copy005')}
              onPress={() => {
                setShowExplanation(false);
                void writeBoolean(STORAGE_KEYS.restExplanation(studentId), true);
              }}
            />
          </Card>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    bottom: 4,
    elevation: 12,
    shadowColor: colors.modalShadow,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
    zIndex: 20,
  },
  timerRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  spacer: { flex: 1 },
  clock: { color: colors.textPrimary, ...font.mono(22, 'bold') },
  finished: { color: colors.success, ...font.body(17, 'semibold') },
  actions: { flexDirection: 'row', gap: 6 },
  action: { borderColor: colors.borderDefault, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: 6, paddingVertical: 6 },
  actionText: { color: colors.textSecondary, ...font.body(13) },
  skipText: { color: colors.goldText, ...font.body(13) },
  progressTrack: { backgroundColor: colors.borderDefault, height: 4, borderRadius: radius.pill, overflow: 'hidden', marginTop: 4 },
  progressFill: { backgroundColor: colors.gold500, height: 4, borderRadius: radius.pill },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'center', padding: spacing.lg },
  explanation: { gap: spacing.base, padding: spacing.lg },
  explanationTitle: { color: colors.textPrimary, ...typography.headline },
  explanationText: { color: colors.textSecondary, lineHeight: 23, ...typography.body },
});
