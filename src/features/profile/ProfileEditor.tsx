import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useUpsertOnboarding, type OnboardingProfile } from '@/api/domains/onboarding';
import { useSaveBodyWeight } from '@/api/domains/body-weights';
import { useSessionStore } from '@/api/session';
import { ApiError } from '@/api/client';
import { AppButton, font, spacing, typography, useColors } from '@/design';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { NoteSection, WeightSection, BackgroundStep, BasicStep, CompetitionSection, InjuriesSection } from '@/features/onboarding/OnboardingSteps';
import { formFromServer, invalidFieldsForStep, type OnboardingErrorField } from '@/features/onboarding/model';
import { removeMeetPatch } from '@/features/onboarding/meet';
import { t, type TranslationKey } from '@/i18n';
import { ProfileModal, ProfileText } from './components';
import { profilePatch, profileSteps, type ProfileSection } from './model';
export const profileTitles: Record<ProfileSection, TranslationKey> = { weight: 'student.dashboardProfileMetricsView.copy001', note: 'student.rn.profile.note', basics: 'student.myProfileView.copy009', background: 'student.myProfileView.copy011', injuries: 'student.myProfileView.copy005', competition: 'student.rn.meet.title' };
const profileEditorTitles: Record<ProfileSection, TranslationKey> = {
  weight: 'student.dashboardProfileMetricsView.copy001',
  note: 'student.rn.profile.note',
  basics: 'student.profileCardsSection.copy002',
  background: 'student.profileCardsSection.copy003',
  competition: 'student.rn.meet.title',
  injuries: 'student.profileCardsSection.copy008',
};
const sections = { weight: WeightSection, note: NoteSection, basics: BasicStep, background: BackgroundStep, injuries: InjuriesSection, competition: CompetitionSection };
export function ProfileEditor({ section, profile, onClose }: { section: ProfileSection; profile: OnboardingProfile | null; onClose: () => void }) {
  const colors = useColors();
  const [form, setForm] = useState(() => {
    const initial = formFromServer(profile);
    return section === 'competition' ? { ...initial, isCompeting: true, competitionDate: profile?.is_competing && profile.competition_date ? profile.competition_date : formFromServer(null).competitionDate } : initial;
  });
  const [initialWeightKg] = useState(() => form.weightKg);
  const [weightEdited, setWeightEdited] = useState(false);
  const [errorFields, setErrorFields] = useState<Set<OnboardingErrorField>>(new Set());
  const [error, setError] = useState('');
  const save = useUpsertOnboarding();
  const studentId = useSessionStore(state => state.user?.id ?? profile?.user_id ?? '');
  const saveWeight = useSaveBodyWeight(studentId);
  const busy = save.isPending || saveWeight.isPending;
  const Content = sections[section];
  const submit = async () => {
    let invalid = invalidFieldsForStep(form, profileSteps[section]);
    if (section === 'injuries' || section === 'note') invalid = [];
    const weightChanged = Number(form.weightKg) !== Number(initialWeightKg);
    if (section === 'basics' && !weightChanged && !weightEdited) invalid = invalid.filter(field => field !== 'weightKg');
    if (section === 'weight') invalid = invalid.filter(field => field === 'weightKg');
    setErrorFields(new Set(invalid));
    if (invalid.length) {
      setError(t(section === 'competition' && (invalid.includes('federation') || invalid.includes('weightClass'))
        ? 'student.rn.meet.chooseFederationAndWeightClass' : 'student.myProfileViewModel.copy002'));
      return;
    }
    setError('');
    try {
      const patch = profilePatch(profileSteps[section], form, section);
      if (section === 'weight' && patch.weight_kg) await saveWeight.mutateAsync(patch.weight_kg);
      else if (section === 'basics') {
        const { weight_kg: weightKg, ...basics } = patch;
        await save.mutateAsync(basics);
        if (weightChanged && weightKg) await saveWeight.mutateAsync(weightKg);
      } else await save.mutateAsync(patch);
      onClose();
    }
    catch (failure) { setError(t(failure instanceof ApiError && failure.code === 'ONE_RM_LOCKED' ? 'student.myProfileViewModel.copy001' : 'student.myProfileViewModel.copy002')); }
  };
  const removeMeet = () => Alert.alert(t('student.rn.meet.confirmRemove'), undefined, [
    { text: t('student.accountSecuritySheets.copy013'), style: 'cancel' },
    { text: t('student.rn.meet.removeAction'), style: 'destructive', onPress: async () => {
      try { await save.mutateAsync(removeMeetPatch()); onClose(); }
      catch { setError(t('student.myProfileViewModel.copy002')); }
    } },
  ]);
  return <ProfileModal title={t(profileEditorTitles[section])} onClose={onClose} busy={busy}>
    <Content key={section === 'basics' ? form.unitPreference ?? 'unset' : section} showHelp={section === 'weight'} profileLayout errorFields={errorFields} form={form} update={(patch) => {
      if (patch.weightKg !== undefined) setWeightEdited(true);
      setForm((current) => ({ ...current, ...patch }));
    }} />
    {error ? <ProfileText error>{error}</ProfileText> : null}
    {section === 'injuries' ? <Text style={{ ...font.body(12), color: colors.textMuted, textAlign: 'center' }}>{t('student.rn.profile.notify')}</Text> : null}
    <AppButton label={t('student.profileCardsSection.copy013')} disabled={busy} onPress={() => void submit()} />
    {section === 'competition' && profile?.is_competing && profile.competition_date ? <FeedbackPressable accessibilityRole="button" disabled={busy} onPress={removeMeet} style={{ padding: spacing.sm, alignItems: 'center' }}>
      <Text style={{ color: colors.danger, ...typography.bodyEmphasis }}>{t('student.rn.meet.remove')}</Text>
    </FeedbackPressable> : null}
  </ProfileModal>;
}
