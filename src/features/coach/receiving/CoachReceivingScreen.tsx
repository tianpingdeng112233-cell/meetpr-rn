import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { font, radius, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { chatRepository } from '@/api/domains/chat';
import { useCoachReceiving } from './use-coach-receiving';
import { useCoachData } from '../CoachDataProvider';
import { Pill, ReceivingState } from './ReceivingUI';
export function CoachReceivingScreen() {
  const colors = useColors();
  const model = useCoachReceiving();
  // iOS CoachReceivingView hands the roster status to the conversation so its subtitle can show active / attention.
  const { rows: rosterRows } = useCoachData();
  const [opening, setOpening] = useState(false);
  async function open(row: typeof model.rows[number]) {
    if (opening) return;
    setOpening(true);
    try {
      const id = row.conversation?.id ?? (await chatRepository.open(row.studentID)).conversation.id;
      const status = rosterRows.find(entry => entry.student.id === row.studentID)?.student.status;
      router.push({ pathname: '/(coach)/conversation/[conversationId]', params: { conversationId: id, studentName: row.studentName, ...(status ? { status } : {}) } });
    } catch { Alert.alert(t('coach.chat.unableToOpenConversation'), undefined, [{ text: t('coach.chat.ok') }]); }
    finally { setOpening(false); }
  }
  return <Screen><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} refreshControl={<RefreshControl refreshing={model.refreshing && model.loaded} onRefresh={() => void model.refresh()} tintColor={colors.gold500} />}>
    <Text style={{ ...font.mono(11, 'semibold'), letterSpacing: 0.66, color: colors.gold500 }}>{t('coach.inbox.eyebrow %lld', [model.count])}</Text>
    <Text style={{ ...font.display(34), color: colors.textPrimary }}>{t('coach.inbox.title')}</Text>
    {model.state !== 'content' ? <ReceivingState state={model.state} retry={() => void model.refresh()} /> : <>
      <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.card, overflow: 'hidden' }}>
        {model.rows.map((row, index) => <View key={row.studentID} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderTopWidth: index ? 1 : 0, borderColor: colors.borderHairline }}>
          <Pressable testID={`coach.inbox.chat.${row.studentID}`} accessibilityRole="button" disabled={opening} onPress={() => void open(row)} style={{ flex: 1, minHeight: 76, justifyContent: 'center', gap: 5 }}>
            <Text numberOfLines={1} style={{ ...font.body(15, 'bold'), color: colors.textPrimary }}>{row.studentName}</Text>
            <Text numberOfLines={1} style={{ ...font.body(12), color: colors.textTertiary }}>{row.lastPreview}</Text>
          </Pressable>
          {row.unreadCount > 0 ? <View accessible accessibilityLabel={t('coach.inbox.unreadAccessibility %lld', [row.unreadCount])} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} /> : null}
          {row.pendingVideoCount > 0 ? <Pill mono testID={`coach.inbox.video.${row.studentID}`} label={`▶ ${row.pendingVideoCount}`} accessibilityLabel={t('coach.inbox.pendingVideosAccessibility %@ %lld', [row.studentName, row.pendingVideoCount])} onPress={() => router.push({ pathname: '/(coach)/pending-videos/[studentId]', params: { studentId: row.studentID, studentName: row.studentName } })} /> : null}
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.textDisabled }}>›</Text>
        </View>)}
      </View>
      <Text style={{ ...font.body(12), color: colors.textDisabled }}>{t('coach.inbox.hint')}</Text>
    </>}
  </ScrollView></Screen>;
}
