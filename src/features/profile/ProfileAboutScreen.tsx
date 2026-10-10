import { Fragment, useState } from 'react';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useSessionStore } from '@/api/session';
import { t } from '@/i18n';
import { MyProfileDivider, MyProfileGroupCard } from './components';
import { ProfilePage, ProfilePageRow, ProfilePageStatus } from './ProfilePage';
import { profileRowValues, type ProfileSection } from './model';
import { ProfileEditor, profileTitles } from './ProfileEditor';

export function ProfileAboutScreen() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  const [edit, setEdit] = useState<ProfileSection | null>(null);
  const values = profile.data ? profileRowValues(profile.data) : null;
  return <ProfilePage title={t('student.rn.profile.about')}>
    {values ? <MyProfileGroupCard>
      {(['basics', 'background', 'environment', 'muscles'] as const).map((section, index) => <Fragment key={section}>
        {index ? <MyProfileDivider inset /> : null}
        <ProfilePageRow title={t(section === 'basics' ? 'student.profileCardsSection.copy002' : profileTitles[section])} value={values[section]} onPress={() => setEdit(section)} />
      </Fragment>)}
    </MyProfileGroupCard> : <ProfilePageStatus pending={profile.isPending} failed={profile.isError} retry={() => void profile.refetch()} />}
    {profile.data && profile.isError ? <ProfilePageStatus pending={false} failed retry={() => void profile.refetch()} /> : null}
    {edit ? <ProfileEditor section={edit} profile={profile.data ?? null} onClose={() => setEdit(null)} /> : null}
  </ProfilePage>;
}
