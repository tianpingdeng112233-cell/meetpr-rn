import { useState } from 'react';
import { useUpsertOnboarding, type OnboardingProfile } from '@/api/domains/onboarding';
import { ApiError } from '@/api/client';
import { AppButton } from '@/design';
import { BackgroundStep, BasicStep, CompetitionSection, EnvironmentStep, InjuriesSection, MusclesSection, RecoveryStep } from '@/features/onboarding/OnboardingSteps';
import { formFromServer, invalidFieldsForStep, type OnboardingForm } from '@/features/onboarding/model';
import { t, type TranslationKey } from '@/i18n';
import { ProfileModal, ProfileText } from './components';
import { profilePatch, profileSteps, type ProfileSection } from './model';
export const profileTitles: Record<ProfileSection, TranslationKey> = { basics: 'student.myProfileView.copy009', background: 'student.myProfileView.copy011', environment: 'student.myProfileView.copy012', recovery: 'student.myProfileView.copy004', muscles: 'student.myProfileView.copy007', injuries: 'student.myProfileView.copy005', competition: 'student.myProfileView.copy008' };
const profileEditorTitles: Record<ProfileSection, TranslationKey> = {
  basics: 'student.profileCardsSection.copy002',
  background: 'student.profileCardsSection.copy003',
  environment: 'student.profileCardsSection.copy004',
  recovery: 'student.profileCardsSection.copy005',
  muscles: 'student.profileCardsSection.copy006',
  competition: 'student.profileCardsSection.copy007',
  injuries: 'student.profileCardsSection.copy008',
};
const sections = { basics: BasicStep, background: BackgroundStep, environment: EnvironmentStep, recovery: RecoveryStep, muscles: MusclesSection, injuries: InjuriesSection, competition: CompetitionSection };
export function ProfileEditor({ section, profile, onClose }: { section: ProfileSection; profile: OnboardingProfile; onClose: () => void }) {
  const [form, setForm] = useState(() => formFromServer(profile));
  const [errorFields, setErrorFields] = useState<Set<keyof OnboardingForm>>(new Set());
  const [error, setError] = useState('');
  const save = useUpsertOnboarding();
  const Content = sections[section];
  const submit = async () => {
    let invalid = invalidFieldsForStep(form, profileSteps[section]);
    if (section === 'injuries') invalid = [];
    setErrorFields(new Set(invalid));
    if (invalid.length) { setError(t('student.myProfileViewModel.copy002')); return; }
    setError('');
    try { await save.mutateAsync(profilePatch(profileSteps[section], form, section)); onClose(); }
    catch (failure) { setError(t(failure instanceof ApiError && failure.code === 'ONE_RM_LOCKED' ? 'student.myProfileViewModel.copy001' : 'student.myProfileViewModel.copy002')); }
  };
  return <ProfileModal title={t(profileEditorTitles[section])} onClose={onClose} busy={save.isPending}>
    <Content key={section === 'basics' ? form.unitPreference ?? 'unset' : section} profileLayout errorFields={errorFields} form={form} update={(patch) => setForm((current) => ({ ...current, ...patch }))} />
    {error ? <ProfileText error>{error}</ProfileText> : null}
    <AppButton label={t('student.profileCardsSection.copy013')} disabled={save.isPending} onPress={() => void submit()} />
  </ProfileModal>;
}
