import { useState } from 'react';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useSessionStore } from '@/api/session';
import { t } from '@/i18n';
import { MyProfileGroupCard } from './components';
import { ProfilePage, ProfilePageRow, ProfilePageStatus } from './ProfilePage';
import { injuryChips } from './model';
import { ProfileEditor } from './ProfileEditor';

export function ProfileHealthScreen() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  const [edit, setEdit] = useState<'injuries' | null>(null);
  return <ProfilePage title={t('student.rn.profile.health')}>
    {profile.data ? <MyProfileGroupCard>
      <ProfilePageRow title={t('student.myProfileView.copy005')} value={injuryChips(profile.data.injury_areas).join(' · ')} onPress={() => setEdit('injuries')} />
    </MyProfileGroupCard> : <ProfilePageStatus pending={profile.isPending} failed={profile.isError} retry={() => void profile.refetch()} />}
    {profile.data && profile.isError ? <ProfilePageStatus pending={false} failed retry={() => void profile.refetch()} /> : null}
    {edit === 'injuries' ? <ProfileEditor section="injuries" profile={profile.data ?? null} onClose={() => setEdit(null)} /> : null}
  </ProfilePage>;
}
