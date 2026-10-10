import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useMineBindRequest } from '@/api/domains/bind';
import { useSessionStore } from '@/api/session';
import { Card, Screen, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { useOpenCoachChat } from '@/features/chat/open-coach-chat';
import { ProgressMenuRow } from '@/features/history/ProgressMenuRow';
import { MyProfileHeader } from './MyProfileHeader';
import { ProfileIdentityCard } from './ProfileIdentityCard';
import { ProfileText } from './components';
import { profileCoachName, profileIdentity, profileMenuValues } from './model';
import { ProfileEditor } from './ProfileEditor';

export function MyProfileScreen({ editSection, onEditClose }: { editSection?: 'basics' | 'competition' | 'weight' | 'note'; onEditClose?: () => void } = {}) {
  const user = useSessionStore(state => state.user);
  const studentId = user?.id ?? '';
  const profile = useOnboardingProfile(studentId);
  const binding = useMineBindRequest();
  const chat = useOpenCoachChat(studentId);
  const router = useRouter();
  const colors = useColors();
  const [edit, setEdit] = useState<'competition' | 'note' | null>(null);
  const blank = !profile.data && (profile.isPending || profile.isError);
  const values = !blank && profile.data ? profileMenuValues(profile.data) : { about: '', health: '', competition: '', note: '' };
  return <Screen edges={['top']}><ScrollView contentContainerStyle={{ padding: spacing.pageHorizontal, gap: spacing.base, paddingBottom: spacing.xl }} refreshControl={<RefreshControl tintColor={colors.gold500} refreshing={profile.isRefetching} onRefresh={() => void profile.refetch()} />}>
    <MyProfileHeader unreadCount={chat.totalUnread} onOpenChat={() => void chat.openCoachChat()} />
    <ProfileIdentityCard identity={profileIdentity(user)} coach={binding.isPending || binding.isError ? '' : profileCoachName(binding.data?.bind_request)} profile={profile.data ?? null} blank={blank} />
    <View style={{ gap: spacing.point10 }}>
      {!blank && !profile.data ? <Card><ProfileText>{t('student.myProfileView.copy001')}</ProfileText></Card> : <>
        <ProgressMenuRow icon="account-outline" title={t('student.rn.profile.about')} value={values.about} onPress={() => router.push('/profile/about')} />
        <ProgressMenuRow icon="heart-outline" title={t('student.rn.profile.health')} value={values.health} onPress={() => router.push('/profile/health')} />
        <ProgressMenuRow icon="flag-outline" title={t('student.rn.meet.title')} value={values.competition} onPress={() => setEdit('competition')} />
        <ProgressMenuRow icon="pencil-outline" title={t('student.rn.profile.note')} value={values.note} onPress={() => setEdit('note')} />
      </>}
      <ProgressMenuRow icon="tune-variant" title={t('student.rn.profile.settings')} value="" onPress={() => router.push('/profile/settings')} />
    </View>
    {profile.isError ? <Pressable accessibilityRole="button" onPress={() => void profile.refetch()}><ProfileText>{t('student.myProfileView.copy002')}</ProfileText></Pressable> : null}
  </ScrollView>
    {edit ? <ProfileEditor key={`${studentId}:${edit}`} section={edit} profile={profile.data ?? null} onClose={() => setEdit(null)} /> : null}
    {editSection && onEditClose && !profile.isPending && !profile.isError ? <ProfileEditor key={`${studentId}:${editSection}`} section={editSection} profile={profile.data ?? null} onClose={onEditClose} /> : null}
  </Screen>;
}
