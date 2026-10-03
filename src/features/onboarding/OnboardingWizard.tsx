import { t } from '@/i18n';

import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalyticsEvent, AnalyticsScreen, screen, track } from '@/analytics';
import { ApiError } from '@/api/client';
import {
  onboardingRepository,
  type OnboardingProfile,
} from '@/api/domains/onboarding';
import { AppButton, useColors, type Colors, spacing, typography } from '@/design';

import {
  canAdvance,
  completionValidationResult,
  createEmptyOnboardingForm,
  fullOnboardingPatch,
  invalidFieldsForStep,
  mergeServerAndDraft,
  ONBOARDING_STEP_COUNT,
  getOnboardingStepTitles,
  onboardingPatchForStep,
  resumeStep,
  type OnboardingForm,
  type OnboardingStep,
} from './model';
import { OnboardingStepContent } from './OnboardingSteps';
import { onboardingDraftStorage } from './storage';

const STEP_ANALYTICS_NAMES = [
  'goal',
  'experience',
  'lifts',
  'schedule',
  'competition',
  'equipment',
  'review',
] as const;

type Props = {
  onCompleted: (profile: OnboardingProfile) => void;
  onExit: () => void;
  profile: OnboardingProfile | null;
  studentId: string;
  visible: boolean;
};

export function OnboardingWizard({
  onCompleted,
  onExit,
  profile,
  studentId,
  visible,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState<OnboardingForm>(() => createEmptyOnboardingForm());
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [errorFields, setErrorFields] = useState<Set<keyof OnboardingForm>>(new Set());

  // Reset before committing a reopened modal so the old form never flashes.
  const [previousVisible, setPreviousVisible] = useState(visible);
  if (visible !== previousVisible) {
    setPreviousVisible(visible);
    if (visible) setLoading(true);
  }

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void onboardingDraftStorage
      .read(studentId)
      .then((draft) => {
        if (!active) return;
        const merged = mergeServerAndDraft(profile, draft);
        setForm(merged);
        setStep(resumeStep(merged));
        setSaveBanner(null);
        setCompletionError(null);
        setErrorFields(new Set());
        void screen(AnalyticsScreen.OnboardingWizard);
      })
      .catch(() => {
        if (!active) return;
        const merged = mergeServerAndDraft(profile, null);
        setForm(merged);
        setStep(resumeStep(merged));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile, studentId, visible]);

  useEffect(() => {
    if (!visible || loading) return;
    void track(AnalyticsEvent.OnboardingStep, {
      name: STEP_ANALYTICS_NAMES[step - 1],
      step,
    });
  }, [loading, step, visible]);

  const update = (patch: Partial<OnboardingForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrorFields((current) => {
      const next = new Set(current);
      Object.keys(patch).forEach((field) => next.delete(field as keyof OnboardingForm));
      return next;
    });
    setCompletionError(null);
  };

  const persistDraft = async () => {
    await onboardingDraftStorage.write(studentId, {
      form,
      savedAt: new Date().toISOString(),
    });
  };

  const bestEffortPatch = async (currentStep: OnboardingStep) => {
    try {
      await onboardingRepository.upsert(onboardingPatchForStep(form, currentStep));
      setSaveBanner(null);
    } catch {
      setSaveBanner(t('student.onboardingWizardViewModel.copy004'));
    }
  };

  const saveAndExit = async () => {
    if (editing || loading) return;
    setEditing(true);
    try {
      await persistDraft();
      await bestEffortPatch(step);
      await track(AnalyticsEvent.FlowCancel, { flow: 'onboarding', step });
      onExit();
    } finally {
      setEditing(false);
    }
  };

  const finish = async () => {
    setCompletionError(null);
    try {
      await onboardingRepository.upsert(fullOnboardingPatch(form));
    } catch (error) {
      setCompletionError(
        error instanceof ApiError && error.code === 'ONE_RM_LOCKED'
          ? t('student.onboardingWizardViewModel.copy001')
          : t('student.onboardingWizardViewModel.copy002'),
      );
      return;
    }

    try {
      const completed = await onboardingRepository.complete();
      await onboardingDraftStorage.clear(studentId);
      await track(AnalyticsEvent.OnboardingComplete, { steps: ONBOARDING_STEP_COUNT });
      onCompleted(completed);
    } catch (error) {
      const validation = completionValidationResult(error);
      if (validation) {
        setErrorFields(validation.errorFields);
        setStep(validation.step);
        setCompletionError(t('student.rn.onboarding.completeRequired'));
      } else {
        setCompletionError(t('student.onboardingWizardViewModel.copy002'));
      }
    }
  };

  const advance = async () => {
    const invalid = invalidFieldsForStep(form, step);
    if (invalid.length > 0) {
      setErrorFields(new Set(invalid));
      return;
    }
    setEditing(true);
    try {
      await persistDraft();
      if (step === ONBOARDING_STEP_COUNT) await finish();
      else {
        await bestEffortPatch(step);
        setStep((step + 1) as OnboardingStep);
      }
    } finally {
      setEditing(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={() => void saveAndExit()} visible={visible}>
      <SafeAreaView style={styles.root}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.gold500} size="large" />
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.root}>
            <View style={styles.nav}>
              <Pressable disabled={editing} onPress={() => void saveAndExit()}>
                <Text style={[styles.exit, editing && styles.disabled]}>{t('student.onboardingWizardView.copy011')}</Text>
              </Pressable>
              <Text style={styles.stepLabel}>Step {step} of 7</Text>
              <View style={styles.navSpacer} />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(step / 7) * 100}%` }]} />
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{getOnboardingStepTitles()[step - 1]}</Text>
              <OnboardingStepContent
                errorFields={errorFields}
                form={form}
                step={step}
                update={update}
              />
              {saveBanner ? <Text style={styles.saveBanner}>{saveBanner}</Text> : null}
              {completionError ? <Text style={styles.error}>{completionError}</Text> : null}
            </ScrollView>
            <View style={styles.footer}>
              <AppButton haptic="none"
                disabled={editing || step === 1}
                label={t('student.onboardingWizardView.copy012')}
                onPress={() => setStep((step - 1) as OnboardingStep)}
                style={styles.back}
                variant="secondary"
              />
              <AppButton
                disabled={editing || !canAdvance(form, step)}
                label={
                  editing
                    ? t('student.progression.saving')
                    : step === 7
                      ? t('student.onboardingWizardView.copy013')
                      : t('student.onboardingWizardView.copy014')
                }
                onPress={() => void advance()}
                style={styles.next}
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  root: { backgroundColor: colors.bgBase, flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  nav: { alignItems: 'center', flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.base },
  exit: { color: colors.textPrimary, width: 112, ...typography.body },
  disabled: { opacity: 0.35 },
  stepLabel: { color: colors.textSecondary, flex: 1, textAlign: 'center', ...typography.bodyEmphasis },
  navSpacer: { width: 112 },
  progressTrack: { backgroundColor: colors.bgStack, height: 3 },
  progressFill: { backgroundColor: colors.gold500, height: 3 },
  content: { gap: spacing.lg, padding: spacing.base, paddingBottom: spacing.xl },
  title: { color: colors.textPrimary, ...typography.title1 },
  saveBanner: { backgroundColor: colors.bgInset, color: colors.textSecondary, padding: spacing.md, ...typography.footnote },
  error: { color: colors.danger, textAlign: 'center', ...typography.footnote },
  footer: { borderTopColor: colors.borderDefault, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, padding: spacing.base },
  back: { flex: 1 },
  next: { flex: 2 },
});
