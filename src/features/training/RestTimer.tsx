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
        setTimeout(onClose, TRAINING_LIMITS.transientBannerMs);
      }
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [durationSeconds, endAt, onClose, showExplanation]);

  if (durationSeconds === null) return null;

  const adjust = (delta: number) => {
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
      <Card style={styles.overlay}>
        <View style={styles.timerCopy}>
          <MaterialCommunityIcons color={colors.success} name="timer-outline" size={22} />
          <View>
            <Text style={styles.label}>{remaining === 0 ? `${t('student.restTimerOverlay.copy003')} 💪` : t('student.restTimerPreferenceRow.copy001')}</Text>
            {remaining > 0 ? <Text style={styles.clock}>{formatClock(remaining)}</Text> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => adjust(-30)} style={styles.action}><Text style={styles.actionText}>-30s</Text></Pressable>
          <Pressable onPress={() => adjust(-remaining)} style={styles.action}><Text style={styles.actionText}>{t('student.readinessCheckinSheet.copy002')}</Text></Pressable>
          <Pressable onPress={() => adjust(30)} style={styles.action}><Text style={styles.actionText}>+30s</Text></Pressable>
        </View>
      </Card>
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
    alignItems: 'center',
    bottom: spacing.base,
    elevation: 12,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.base,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.base,
    zIndex: 20,
  },
  timerCopy: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm },
  label: { color: colors.textSecondary, ...typography.footnote },
  clock: { color: colors.textPrimary, ...font.mono(24, 'bold') },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: { backgroundColor: colors.bgStack, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  actionText: { color: colors.textPrimary, ...typography.footnote },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'center', padding: spacing.lg },
  explanation: { gap: spacing.base, padding: spacing.lg },
  explanationTitle: { color: colors.textPrimary, ...typography.headline },
  explanationText: { color: colors.textSecondary, lineHeight: 23, ...typography.body },
});
