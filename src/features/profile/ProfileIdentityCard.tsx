import { Alert, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import { Card, font, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { oneRMValues, profileInitials } from './model';

type Props = {
  identity: string;
  coach: string;
  profile: OnboardingProfile | null;
  blank: boolean;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
};
/** The avatar slot stays display-only in step one; its footprint is reserved for step two. */
export function ProfileIdentityCard({ identity, coach, profile, blank }: Props) {
  const colors = useColors();
  const initials = profileInitials(identity);
  const values = oneRMValues(profile ?? { squat_1rm_kg: null, bench_1rm_kg: null, deadlift_1rm_kg: null });
  const numbers = blank ? ['', '', '', ''] : [...values.lifts, values.total];
  return <Card style={{ padding: spacing.base, gap: spacing.point14, elevation: 0, shadowOpacity: 0 }}>
    <View accessible accessibilityLabel={[identity, coach ? t('student.rn.profile.coach', [coach]) : ''].filter(Boolean).join(', ')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ width: spacing.xxl, height: spacing.xxl, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
        {initials ? <Text style={{ ...font.body(16, 'semibold'), color: colors.textPrimary }}>{initials}</Text> : <MaterialCommunityIcons name="account-outline" size={24} color={colors.textMuted} />}
      </View>
      <View style={{ flex: 1, gap: spacing.point3 }}>
        {identity ? <Text numberOfLines={1} style={{ ...font.body(17, 'semibold'), color: colors.textPrimary }}>{identity}</Text> : null}
        {coach ? <Text numberOfLines={1} style={{ ...font.body(13), color: colors.textMuted }}>{t('student.rn.profile.coach', [coach])}</Text> : null}
      </View>
    </View>
    <View style={{ height: spacing.point1, backgroundColor: colors.borderSubtle }} />
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.rn.profile.oneRMLabel', numbers)} onPress={() => Alert.alert(t('student.myProfileView.copy019'), t('student.myProfileView.copy020'))} style={{ gap: spacing.point14 }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['squat', 'bench', 'deadlift', 'total'] as const).map((lift, index) => <View key={lift} style={{ flex: 1, minWidth: 0, gap: spacing.point2 }}>
          <Text style={{ ...font.body(11), color: colors.textMuted }}>{t(lift === 'squat' ? 'coach.planning.lift.squat' : lift === 'deadlift' ? 'coach.planning.lift.deadlift' : `student.rn.profile.${lift}`)}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...font.mono(22, 'bold'), color: lift === 'total' ? colors.goldText : colors.textPrimary }}>{numbers[index]}</Text>
        </View>)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.point6 }}>
        <MaterialCommunityIcons name="lock-outline" size={12} color={colors.textMuted} />
        <Text style={{ flex: 1, ...font.body(12), color: colors.textMuted }}>{t('student.rn.profile.locked')}</Text>
      </View>
    </Pressable>
  </Card>;
}
