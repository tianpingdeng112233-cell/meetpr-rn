import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { font, radius, Screen, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import { daySections, shouldDismissStudentList } from '@/domain/coach/pending-videos';
import { useCoachReceiving } from './use-coach-receiving';
import { Pill, ReceivingState } from './ReceivingUI';
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
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 }}><Pill label={t('coach.videoFeedback.back')} onPress={() => router.back()} /><Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{studentName ?? items[0]?.studentName}</Text></View>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} refreshControl={<RefreshControl refreshing={model.refreshing && model.loaded} onRefresh={() => void model.refresh()} />}>
      {!items.length ? <ReceivingState state={model.loaded ? 'empty' : model.state === 'failed' ? 'failed' : 'loading'} pending retry={() => void model.refresh()} /> : daySections(items).map(section => <View key={section.day} style={{ gap: 12 }}>
        <Text style={{ ...font.mono(12), color: colors.textTertiary }}>{new Date(`${section.day}T12:00:00`).toLocaleDateString(getLocale(), { dateStyle: 'full' })}</Text>
        {section.items.map(item => {
          const megabytes = item.sizeBytes / 1048576;
          return <Pressable key={item.id} testID={`coach.video.row.${item.id}`} accessibilityRole="button" accessibilityLabel={t('coach.videoFeedback.rowAccessibility', [item.exerciseName ?? ''])} onPress={() => router.push({ pathname: '/(coach)/video-feedback/[videoId]', params: { videoId: item.id, studentId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceCard, padding: 12, borderRadius: radius.card }}>
            <View style={{ height: 52, width: 52, borderRadius: radius.card, backgroundColor: colors.bgStack, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, color: colors.gold500 }}>▶</Text></View>
            <View style={{ flex: 1, gap: 5 }}>{item.exerciseName ? <Text style={{ ...font.body(16, 'semibold'), color: colors.textPrimary }}>{item.exerciseName}</Text> : null}<Text style={{ ...font.body(12), color: colors.textTertiary }}>{new Date(item.uploadedAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false })} · {t('coach.videoFeedback.sizeMegabytes', [megabytes.toFixed(megabytes >= 10 ? 0 : 1)])}</Text></View>
            <Text style={{ color: colors.textDisabled }}>›</Text>
          </Pressable>;
        })}
      </View>)}
    </ScrollView>
  </Screen></FullScreenDestination>;
}
