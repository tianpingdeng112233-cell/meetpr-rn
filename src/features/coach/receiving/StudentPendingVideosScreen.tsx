import { useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { font, radius, Screen, spacing, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import { daySections, shouldDismissStudentList } from '@/domain/coach/pending-videos';
import { useCoachReceiving } from './use-coach-receiving';
import { CoachNavHeader } from '../CoachNavHeader';
import { ReceivingState } from './ReceivingUI';
import { FullScreenDestination, useDestinationFocused } from './FullScreenDestination';
export function StudentPendingVideosScreen({ studentId, studentName }: { studentId: string; studentName?: string }) {
  const colors = useColors();
  const model = useCoachReceiving();
  const focused = useDestinationFocused();
  const items = model.items.filter(item => item.studentID === studentId);
  useEffect(() => {
    if (model.loaded && shouldDismissStudentList(items.length === 0, !focused)) router.back();
  }, [focused, items.length, model.loaded]);
  return <FullScreenDestination><Screen>
    <CoachNavHeader title={studentName ?? items[0]?.studentName ?? ''} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.pageHorizontal, paddingVertical: spacing.point14, gap: spacing.space6 }} refreshControl={<RefreshControl refreshing={model.refreshing && model.loaded} onRefresh={() => void model.refresh()} />}>
      {!items.length ? <ReceivingState state={model.loaded ? 'empty' : model.state === 'failed' ? 'failed' : 'loading'} pending retry={() => void model.refresh()} /> : daySections(items).map(section => <View key={section.day} style={{ gap: spacing.space2 }}>
        <Text style={{ ...font.mono(12, 'medium'), letterSpacing: 0.6, color: colors.textTertiary }}>{new Date(`${section.day}T12:00:00`).toLocaleDateString(getLocale(), { dateStyle: 'full' })}</Text>
        {section.items.map(item => {
          const megabytes = item.sizeBytes / 1048576;
          const exerciseName = item.exerciseName || t('coach.videoFeedback.trainingVideo');
          return <Pressable key={item.id} testID={`coach.video.row.${item.id}`} accessibilityRole="button" accessibilityLabel={t('coach.videoFeedback.rowAccessibility', [exerciseName])} onPress={() => router.push({ pathname: '/(coach)/video-feedback/[videoId]', params: { videoId: item.id, studentId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space4, backgroundColor: colors.surfaceCard, padding: spacing.space4, borderRadius: radius.card }}>
            <View style={{ height: spacing.point52, width: spacing.point52, borderRadius: radius.inset, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="play-box" size={20} color={colors.gold500} /></View>
            <View style={{ flex: 1, gap: spacing.space1 }}><Text style={{ ...font.body(16, 'semibold'), color: colors.textPrimary }}>{exerciseName}</Text><Text style={{ ...font.mono(11, 'medium'), letterSpacing: 0.8, color: colors.textTertiary }}>{new Date(item.uploadedAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false })} · {t('coach.videoFeedback.sizeMegabytes', [megabytes.toFixed(megabytes >= 10 ? 0 : 1)])}</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={13} color={colors.textDisabled} />
          </Pressable>;
        })}
      </View>)}
    </ScrollView>
  </Screen></FullScreenDestination>;
}
