import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { font, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { studentEmptyState } from './student-empty-state';

export function StudentEmptyState({ state, coachName, hasCoach }: { state: NonNullable<ReturnType<typeof studentEmptyState>>; coachName: string; hasCoach: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const title = state.kind === 'first' ? t('student.trainingEmpty.firstTitle', [coachName]) : state.kind === 'next' ? t('student.trainingEmpty.nextTitle', [coachName, state.week]) : t('student.trainingEmpty.completedTitle', [state.weeks]);
  const detail = state.kind === 'first' ? t('student.trainingEmpty.firstDetail') : state.kind === 'next' ? t('student.trainingEmpty.nextDetail', [state.previousWeek, state.sessions]) : t('student.trainingEmpty.completedDetail', [coachName]);
  return <View testID={`training.empty.${state.kind}`} style={{ paddingTop: 40, gap: 16, alignItems: 'center' }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="calendar-outline" size={28} color={colors.goldText} /></View>
    <Text style={{ ...font.body(20, 'bold'), color: colors.textPrimary, textAlign: 'center' }}>{hasCoach ? title : t('student.todayWorkoutScreen.copy002')}</Text>
    {hasCoach ? <><Text style={{ ...font.body(14), color: colors.textSecondary, textAlign: 'center', lineHeight: 21 }}>{detail}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingEmpty.message')} onPress={() => router.navigate('/(student)/chat')} style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard }}><MaterialCommunityIcons name="message-outline" size={18} color={colors.textPrimary} /><Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary }}>{t('student.trainingEmpty.message')}</Text></Pressable></> : null}
    {state.kind === 'first' ? <View style={{ width: '100%', gap: 6, marginTop: 24 }}>
      <Text style={{ ...font.body(11), color: colors.textSecondary }}>{t('student.firstRun.waiting.eyebrow')}</Text>
      {(['basics', 'competition'] as const).map(section => <Pressable key={section} accessibilityRole="button" onPress={() => router.navigate({ pathname: '/(student)/profile', params: { edit: section } })} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderHairline }}>
        <Text style={{ ...font.body(15), color: colors.textPrimary }}>{t(section === 'basics' ? 'student.firstRun.waiting.profile' : 'student.firstRun.waiting.meet')}</Text><MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
      </Pressable>)}
    </View> : null}
  </View>;
}
