import { useState } from 'react';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useReadiness } from '@/api/domains/readiness';
import { useSessionStore } from '@/api/session';
import { ReadinessSheet } from '@/features/training/ReadinessSheet';
import { gymDayText } from '@/features/training/policy';
import { t } from '@/i18n';
import { MyProfileDivider, MyProfileGroupCard } from './components';
import { ProfilePage, ProfilePageRow, ProfilePageStatus } from './ProfilePage';
import { injuryChips, readinessSummary, recoverySummary, rowValue } from './model';
import { ProfileEditor } from './ProfileEditor';

export function ProfileHealthScreen() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  const date = gymDayText();
  const readiness = useReadiness(studentId, date);
  const [edit, setEdit] = useState<'recovery' | 'injuries' | null>(null);
  return <ProfilePage title={t('student.rn.profile.health')}>
    {profile.data ? <MyProfileGroupCard>
      <ProfilePageRow title={t('student.myProfileView.copy004')} value={rowValue(readiness.data?.checkin ? readinessSummary(readiness.data.checkin) : recoverySummary(profile.data))} onPress={() => setEdit('recovery')} />
      <MyProfileDivider inset />
      <ProfilePageRow title={t('student.myProfileView.copy005')} value={injuryChips(profile.data.injury_areas).join(' · ')} onPress={() => setEdit('injuries')} />
    </MyProfileGroupCard> : <ProfilePageStatus pending={profile.isPending} failed={profile.isError} retry={() => void profile.refetch()} />}
    {profile.data && profile.isError ? <ProfilePageStatus pending={false} failed retry={() => void profile.refetch()} /> : null}
    {edit === 'injuries' ? <ProfileEditor section="injuries" profile={profile.data ?? null} onClose={() => setEdit(null)} /> : null}
    {edit === 'recovery' ? <ReadinessSheet studentId={studentId} date={date} onComplete={() => setEdit(null)} onSkip={() => setEdit(null)} /> : null}
  </ProfilePage>;
}
