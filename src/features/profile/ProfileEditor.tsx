import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useUpsertOnboarding, type OnboardingProfile } from '@/api/domains/onboarding';
import { ApiError } from '@/api/client';
import { AppButton, spacing, typography, useColors } from '@/design';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { NoteSection, WeightSection, BackgroundStep, BasicStep, CompetitionSection, EnvironmentStep, InjuriesSection, MusclesSection, RecoveryStep } from '@/features/onboarding/OnboardingSteps';
import { formFromServer, invalidFieldsForStep, type OnboardingErrorField } from '@/features/onboarding/model';
import { removeMeetPatch } from '@/features/onboarding/meet';
import { t, type TranslationKey } from '@/i18n';
import { ProfileModal, ProfileText } from './components';
import { profilePatch, profileSteps, type ProfileSection } from './model';
export const profileTitles: Record<ProfileSection, TranslationKey> = { weight: 'student.dashboardProfileMetricsView.copy001', note: 'student.rn.profile.note', basics: 'student.myProfileView.copy009', background: 'student.myProfileView.copy011', environment: 'student.myProfileView.copy012', recovery: 'student.myProfileView.copy004', muscles: 'student.myProfileView.copy007', injuries: 'student.myProfileView.copy005', competition: 'student.rn.meet.title' };
const profileEditorTitles: Record<ProfileSection, TranslationKey> = {
  weight: 'student.dashboardProfileMetricsView.copy001',
  note: 'student.rn.profile.note',
  basics: 'student.profileCardsSection.copy002',
  background: 'student.profileCardsSection.copy003',
  environment: 'student.profileCardsSection.copy004',
  recovery: 'student.profileCardsSection.copy005',
  muscles: 'student.profileCardsSection.copy006',
  competition: 'student.rn.meet.title',
  injuries: 'student.profileCardsSection.copy008',
};
const sections = { weight: WeightSection, note: NoteSection, basics: BasicStep, background: BackgroundStep, environment: EnvironmentStep, recovery: RecoveryStep, muscles: MusclesSection, injuries: InjuriesSection, competition: CompetitionSection };
export function ProfileEditor({ section, profile, onClose }: { section: ProfileSection; profile: OnboardingProfile | null; onClose: () => void }) {
  const colors = useColors();
  const [form, setForm] = useState(() => {
    const initial = formFromServer(profile);
    return section === 'competition' ? { ...initial, isCompeting: true, competitionDate: profile?.is_competing && profile.competition_date ? profile.competition_date : formFromServer(null).competitionDate } : initial;
  });
  const [errorFields, setErrorFields] = useState<Set<OnboardingErrorField>>(new Set());
  const [error, setError] = useState('');
  const save = useUpsertOnboarding();
  const Content = sections[section];
  const submit = async () => {
    let invalid = invalidFieldsForStep(form, profileSteps[section]);
    if (section === 'injuries' || section === 'note') invalid = [];
    if (section === 'weight') invalid = invalid.filter(field => field === 'weightKg');
    setErrorFields(new Set(invalid));
    if (invalid.length) {
      setError(t(section === 'competition' && (invalid.includes('federation') || invalid.includes('weightClass'))
        ? 'student.rn.meet.chooseFederationAndWeightClass' : 'student.myProfileViewModel.copy002'));
      return;
    }
    setError('');
    try { await save.mutateAsync(profilePatch(profileSteps[section], form, section)); onClose(); }
    catch (failure) { setError(t(failure instanceof ApiError && failure.code === 'ONE_RM_LOCKED' ? 'student.myProfileViewModel.copy001' : 'student.myProfileViewModel.copy002')); }
  };
  const removeMeet = () => Alert.alert(t('student.rn.meet.confirmRemove'), undefined, [
    { text: t('student.accountSecuritySheets.copy013'), style: 'cancel' },
    { text: t('student.rn.meet.removeAction'), style: 'destructive', onPress: async () => {
      try { await save.mutateAsync(removeMeetPatch()); onClose(); }
      catch { setError(t('student.myProfileViewModel.copy002')); }
    } },
  ]);
  return <ProfileModal title={t(profileEditorTitles[section])} onClose={onClose} busy={save.isPending}>
    <Content key={section === 'basics' ? form.unitPreference ?? 'unset' : section} showHelp={section === 'weight'} profileLayout errorFields={errorFields} form={form} update={(patch) => setForm((current) => ({ ...current, ...patch }))} />
    {error ? <ProfileText error>{error}</ProfileText> : null}
    <AppButton label={t('student.profileCardsSection.copy013')} disabled={save.isPending} onPress={() => void submit()} />
    {section === 'competition' && profile?.is_competing && profile.competition_date ? <FeedbackPressable accessibilityRole="button" disabled={save.isPending} onPress={removeMeet} style={{ padding: spacing.sm, alignItems: 'center' }}>
      <Text style={{ color: colors.danger, ...typography.bodyEmphasis }}>{t('student.rn.meet.remove')}</Text>
    </FeedbackPressable> : null}
  </ProfileModal>;
}
