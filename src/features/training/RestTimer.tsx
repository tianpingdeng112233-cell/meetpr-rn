import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { t } from '@/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RestTimerSettingsScreen } from '@/features/settings/RestTimerSettingsScreen';
import { useRestPreference } from '@/features/settings/storage';
import { restExplanationRows } from './rest-explanation';
import { AppButton, Card, useColors, type Colors, font, radius, spacing, typography } from '@/design';

import { STORAGE_KEYS, TRAINING_LIMITS } from './constants';
import { readBoolean, writeBoolean } from './storage';
import { RestTimerSession } from './rest-timer-session';
import { restNotificationPermission, restTimerNotifications } from './rest-timer-notification';

type Props = {
  durationSeconds: number | null;
  studentId: string;
  onClose: () => void;
};

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimer(props: Props) {
  return props.durationSeconds === null ? null : <RestTimerContent key={`${props.studentId}:${props.durationSeconds}`} {...props} />;
}

function RestTimerContent({ durationSeconds, onClose, studentId }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [remaining, setRemaining] = useState(durationSeconds ?? 0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [closed, setClosed] = useState(false);
  const closedRef = useRef(false);
  const [explanationLoaded, setExplanationLoaded] = useState(false);
  const [session] = useState(() => {
    return new RestTimerSession(restTimerNotifications);
  });
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosed(true);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    session.close();
    onCloseRef.current();
  }, [session]);

  useEffect(() => {
    let disposed = false;
    void readBoolean(STORAGE_KEYS.restExplanation(studentId)).then((seen) => {
      if (disposed) return;
      setShowExplanation(!seen);
      setExplanationLoaded(true);
    });
    return () => { disposed = true; };
  }, [durationSeconds, studentId]);

  useEffect(() => {
    session.setPaused(true);
    session.start(durationSeconds ?? 0);
    const update = (vibrate = true) => {
      if (!session.canTick()) return;
      if (session.tick()) {
        if (vibrate) Vibration.vibrate(80);
        dismissTimer.current = setTimeout(close, TRAINING_LIMITS.transientBannerMs);
      }
      setRemaining(session.remainingSeconds());
    };
    const changeState = (state: string) => {
      session.setActive(state === 'active', restNotificationPermission());
      if (state === 'active' && session.isClosed()) close();
      else if (state === 'active') update(false);
    };
    changeState(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', changeState);
    const interval = setInterval(update, 250);
    return () => {
      subscription.remove();
      clearInterval(interval);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      session.close();
    };
  }, [close, durationSeconds, session]);

  useEffect(() => {
    session.setPaused(!explanationLoaded || showExplanation || showSettings);
  }, [explanationLoaded, session, showExplanation, showSettings]);

  if (durationSeconds === null || closed) return null;
  const progress = Math.max(0, Math.min(1, remaining / Math.max(1, durationSeconds)));

  const adjust = (delta: number) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    session.adjust(delta);
    setRemaining(session.remainingSeconds());
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
                <Pressable accessibilityRole="button" accessibilityLabel={t('student.restTimerOverlay.copy001')} onPress={close} style={styles.action}><Text style={styles.skipText}>{t('student.restTimerOverlay.copy001')}</Text></Pressable>
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
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.modal, borderTopRightRadius: radius.modal, maxHeight: '100%' }}><ScrollView><Card style={styles.explanation}>
            <Text style={styles.explanationTitle}>{t('student.restTimerExplanationView.copy001')}</Text>
            <Text style={styles.explanationText}>{t('student.restTimerExplanationView.copy002')}</Text>
            {restExplanationRows().map(row => <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
              <Text style={[styles.explanationText, { flex: 1 }]}>{row.label}</Text>
              <Text style={{ ...typography.bodyEmphasis, color: colors.textPrimary }}>{row.duration}</Text>
            </View>)}
            <Text style={styles.explanationText}>{t('student.restTimerExplanationView.copy004')}</Text>
            <AppButton
              label={t('student.restTimerExplanationView.copy005')}
              onPress={() => {
                setShowExplanation(false);
                void writeBoolean(STORAGE_KEYS.restExplanation(studentId), true);
              }}
            />
            <Pressable accessibilityRole="link" accessibilityLabel={t('training.restSettingsLink')}
              onPress={() => { setShowExplanation(false); setShowSettings(true); void writeBoolean(STORAGE_KEYS.restExplanation(studentId), true); }}
              style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
              <Text style={{ ...typography.footnote, textAlign: 'center', color: colors.goldText }}>{t('training.restSettingsLink')}</Text>
            </Pressable>
          </Card></ScrollView></SafeAreaView>
        </View>
      </Modal>
      {showSettings ? <RestSettingsDestination studentId={studentId} onClose={() => setShowSettings(false)} /> : null}
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
  modalBackdrop: { backgroundColor: colors.numberPadScrim, flex: 1, justifyContent: 'flex-end' },
  explanation: { gap: spacing.base, padding: spacing.lg },
  explanationTitle: { color: colors.textPrimary, ...typography.headline },
  explanationText: { color: colors.textSecondary, lineHeight: 23, ...typography.body },
});

function RestSettingsDestination({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const preference = useRestPreference(studentId);
  const colors = useColors();
  if (preference.data) return <RestTimerSettingsScreen studentId={studentId} initial={preference.data} onClose={onClose} />;
  return <Modal visible onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase, padding: spacing.base, gap: spacing.base }}>
    <AppButton variant="secondary" label={t('chat.close')} onPress={onClose} />
    {preference.isError ? <AppButton label={t('student.videoAttachmentSection.copy002')} onPress={() => void preference.refetch()} /> : <ActivityIndicator color={colors.gold500} />}
  </SafeAreaView></Modal>;
}
