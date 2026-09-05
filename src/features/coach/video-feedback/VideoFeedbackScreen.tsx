import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, ToastAndroid, View } from 'react-native';
import { font, radius, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { useSessionStore } from '@/api/session';
import { uploadsRepository } from '@/api/domains/uploads';
import type { VideoMarker } from '@/api/domains/video-markers';
import { track } from '@/analytics/client';
import { AnalyticsEvent } from '@/analytics/types';
import { itemAfterSend, nextItem } from '@/domain/coach/queue-navigator';
import type { PendingVideo } from '@/domain/coach/pending-videos';
import { relativeText } from '@/domain/coach/inbox';
import { useCoachReceiving } from '../receiving/use-coach-receiving';
import { FullScreenDestination } from '../receiving/FullScreenDestination';
import { BackButton, Pill, ReceivingState } from '../receiving/ReceivingUI';
import { useVideoFeedbackSlice } from './use-video-feedback-slice';
import { markerTime, VideoWorkbenchPlayer } from './VideoWorkbenchPlayer';
export function VideoFeedbackScreen({ videoId, studentId }: { videoId: string; studentId?: string }) {
  const model = useCoachReceiving();
  const active = useRef(false);
  useFocusEffect(useCallback(() => { active.current = true; return () => { active.current = false; }; }, []));
  const [currentID, setCurrentID] = useState(videoId);
  const queue = model.items.filter(item => !studentId || item.studentID === studentId);
  const selected = queue.find(item => item.id === currentID);
  const [retained, setRetained] = useState<PendingVideo | null>(selected ?? null);
  if (selected && retained?.id !== selected.id) setRetained(selected);
  const current = selected ?? retained;
  useEffect(() => { if (model.loaded && !current) router.back(); }, [current, model.loaded]);
  function navigate(item: PendingVideo | null) {
    if (item) { setRetained(item); setCurrentID(item.id); }
    else router.back();
  }
  return <FullScreenDestination>{current ? <Workbench key={current.id} item={current} now={model.now} index={queue.findIndex(item => item.id === current.id)} total={queue.length}
    onSkip={() => navigate(nextItem(current.id, queue) ?? queue[0] ?? null)}
    onSend={async text => {
      const successorID = nextItem(current.id, queue)?.id;
      const remaining = await model.sendFeedback(current, text);
      if (!active.current) return;
      ToastAndroid.show(t('coach.videoFeedback.sentFeedback'), ToastAndroid.SHORT);
      void track(AnalyticsEvent.CoachFeedbackSent, { kind: 'video' });
      navigate(itemAfterSend(successorID, remaining.filter(item => !studentId || item.studentID === studentId)));
    }} /> : <Screen><ReceivingState state={model.state === 'failed' ? 'failed' : 'loading'} retry={() => void model.refresh()} /></Screen>}</FullScreenDestination>;
}
function Workbench({ item, now, index, total, onSkip, onSend }: { item: PendingVideo; now: Date; index: number; total: number; onSkip: () => void; onSend: (text: string) => Promise<void> }) {
  const colors = useColors();
  const slice = useVideoFeedbackSlice(item, now);
  const [seconds, setSeconds] = useState(0);
  const [selectedMarkerID, setSelectedMarkerID] = useState<string | null>(null);
  if (selectedMarkerID !== null && !slice.markers?.some(marker => marker.id === selectedMarkerID)) setSelectedMarkerID(null);
  const coachName = useSessionStore(state => state.user?.name ?? null);
  const [markerSheet, setMarkerSheet] = useState<{ time: number; note: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [banner, setBanner] = useState<'empty' | 'failed' | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const log = typeof slice.setInfo === 'object' ? slice.setInfo : null;
  async function send() {
    if (sendingRef.current) return;
    const text = feedback.trim();
    if (!text) { setBanner('empty'); return; }
    sendingRef.current = true; setSending(true); setBanner(null);
    try { await onSend(text); }
    catch { if (alive.current) setBanner('failed'); }
    finally { sendingRef.current = false; if (alive.current) setSending(false); }
  }
  const cells = log ? [
    [t('coach.videoFeedback.weight'), Number(log.weight_kg).toLocaleString('en-US', { maximumFractionDigits: 1, useGrouping: false }), t('coach.videoFeedback.kilograms')],
    [t('coach.videoFeedback.reps'), String(log.reps), t('coach.videoFeedback.repsValue %lld', [log.reps])],
    [t('coach.videoFeedback.rpe'), log.rpe === null ? t('coach.videoFeedback.missingValue') : String(Number(log.rpe)), ''],
    [t('coach.videoFeedback.setOrder'), String(log.set_index + 1), t('coach.videoFeedback.setNumber %lld', [log.set_index + 1])],
  ] : [];
  return <Screen><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault }}>
      <BackButton testID="coach.video.back" disabled={sending} />
      <View style={{ flex: 1, gap: 4 }}><Text numberOfLines={2} style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{t('coach.videoFeedback.title', [item.studentName, item.exerciseName ?? t('coach.videoFeedback.trainingVideo')])}</Text><Text style={{ ...font.body(12), color: colors.textTertiary }}>{t('coach.videoFeedback.headerMeta', [log ? t('coach.videoFeedback.setNumber %lld', [log.set_index + 1]) : t('coach.videoFeedback.trainingVideo'), relativeText(item.uploadedAt, now)])}</Text></View>
      {index >= 0 ? <Text style={{ ...font.mono(12), color: colors.textTertiary }}>{t('coach.videoFeedback.queuePosition %lld %lld', [index + 1, total])}</Text> : null}
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
      <VideoWorkbenchPlayer videoId={item.id} url={slice.url} failed={slice.urlFailed} markers={slice.markers}
        markersFailed={slice.markerError === 'load'} onProgress={setSeconds} onRetry={slice.loadURL}
        refreshURL={async videoId => (await uploadsRepository.url(videoId)).url} onMarkersRefresh={slice.loadMarkers}
        badge={{ exerciseName: item.exerciseName, weightKg: log ? Number(log.weight_kg) : null, reps: log?.reps,
          rpe: log?.rpe != null ? Number(log.rpe) : null, setOrdinal: log ? log.set_index + 1 : null, coachName }}
        selectedMarkerID={selectedMarkerID} onAnnotationClose={() => setSelectedMarkerID(null)}
        onAddMarker={slice.markers !== null ? () => setMarkerSheet({ time: Math.max(0, Math.round(seconds * 1000)) / 1000, note: '' }) : undefined} />
      {slice.markers?.length ? <View style={{ gap: 8 }}><Text style={{ ...font.body(14, 'bold'), color: colors.textPrimary }}>{t('coach.videoFeedback.markerCount %lld', [slice.markers.length])}</Text>{slice.markers.map(marker => <View key={marker.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderColor: colors.borderHairline }}>
        <CoachVideoMarkerRow marker={marker} select={() => setSelectedMarkerID(marker.id)} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('coach.videoFeedback.deleteMarker')} disabled={slice.markerBusy} onPress={() => void slice.deleteMarker(marker.id)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} /></Pressable>
      </View>)}</View> : null}
      {slice.markerError ? <Text style={{ ...font.body(12), color: colors.danger }}>{t(slice.markerError === 'load' ? 'coach.videoFeedback.markersLoadFailed' : slice.markerError === 'save' ? 'coach.videoFeedback.markerSaveFailed' : 'coach.videoFeedback.markerDeleteFailed')}</Text> : null}
      {slice.markerError === 'load' ? <Pill label={t('chat.retry')} onPress={() => void slice.loadMarkers()} /> : null}
      {log ? <View testID="coach.video.setInfo" style={{ flexDirection: 'row', paddingVertical: 16, backgroundColor: colors.surfaceCard, borderRadius: radius.card }}>{cells.map(([label, value, unit], cellIndex) => <View key={label} style={{ flex: 1, paddingHorizontal: 6, gap: 8, borderLeftWidth: cellIndex ? 1 : 0, borderColor: colors.borderDefault }}><Text style={{ ...font.body(10), color: colors.textTertiary }}>{label}</Text><Text style={{ ...font.display(22), color: colors.textPrimary }}>{value}</Text>{unit ? <Text style={{ ...font.body(10), color: colors.textDisabled }}>{unit}</Text> : null}</View>)}</View> : slice.setInfo !== 'loading' ? <Text style={{ ...font.body(12), color: slice.setInfo === 'failed' ? colors.danger : colors.textDisabled }}>{t(slice.setInfo === 'failed' ? 'coach.videoFeedback.setInfoLoadFailed' : 'coach.videoFeedback.setInfoUnavailable')}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}><TextInput testID="coach.video.feedbackInput" accessibilityLabel={t('coach.videoFeedback.feedbackPlaceholder', [item.studentName])} placeholder={t('coach.videoFeedback.feedbackPlaceholder', [item.studentName])} placeholderTextColor={colors.textDisabled} value={feedback} onChangeText={setFeedback} editable={!sending} multiline style={{ flex: 1, minHeight: 48, maxHeight: 140, borderRadius: radius.card, padding: 12, backgroundColor: colors.surfaceCard, color: colors.textPrimary, ...font.body(14) }} /><Pill testID="coach.video.send" label={t('coach.videoFeedback.send')} disabled={sending} onPress={() => void send()} /></View>
      {banner ? <Text accessibilityLiveRegion="polite" style={{ ...font.body(12), color: colors.danger }}>{t(banner === 'empty' ? 'coach.videoFeedback.emptyFeedback' : 'coach.videoFeedback.sendFailed')}</Text> : null}
      <Pressable testID="coach.video.skip" accessibilityRole="button" disabled={sending} onPress={onSkip} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderDefault, opacity: sending ? 0.4 : 1 }}><Text style={{ ...font.body(13, 'semibold'), color: colors.textPrimary }}>{t('coach.videoFeedback.skip')}</Text></Pressable>
    </ScrollView>
    <Modal visible={markerSheet !== null} transparent animationType="slide" onRequestClose={() => { if (!slice.markerBusy) setMarkerSheet(null); }}><View style={{ flex: 1, backgroundColor: colors.modalShadow, justifyContent: 'flex-end' }}><Screen style={{ flex: 0, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}><View style={{ padding: 20, gap: 16 }}>
      <Text style={{ ...font.body(18, 'bold'), color: colors.textPrimary }}>{t('coach.videoFeedback.addMarker')}</Text><Text style={{ ...font.mono(12), color: colors.textTertiary }}>{t('coach.videoFeedback.markerTime')} · {markerTime(markerSheet?.time ?? 0)}</Text>
      <TextInput accessibilityLabel={t('coach.videoFeedback.markerNote')} placeholder={t('coach.videoFeedback.markerNote')} placeholderTextColor={colors.textDisabled} value={markerSheet?.note ?? ''} onChangeText={note => setMarkerSheet(current => current && { ...current, note: Array.from(note).slice(0, 500).join('') })} editable={!slice.markerBusy} multiline style={{ minHeight: 100, maxHeight: 180, color: colors.textPrimary, backgroundColor: colors.bgStack, padding: 12, borderRadius: radius.card }} />
      {slice.markerError === 'save' ? <Text style={{ color: colors.danger }}>{t('coach.videoFeedback.markerSaveFailed')}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Pill label={t('coach.videoFeedback.cancel')} disabled={slice.markerBusy} onPress={() => setMarkerSheet(null)} /><Pill label={t('coach.videoFeedback.save')} disabled={slice.markerBusy} onPress={() => { if (markerSheet) void slice.addMarker(markerSheet.time, markerSheet.note).then(saved => { if (saved) setMarkerSheet(null); }); }} /></View>
    </View></Screen></View></Modal>
  </KeyboardAvoidingView></Screen>;
}

function CoachVideoMarkerRow({ marker, select }: { marker: VideoMarker; select: () => void }) {
  const colors = useColors();
  const style = { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 48 };
  const label = <>
    <Text style={{ ...font.mono(12, 'bold'), color: colors.gold500 }}>{markerTime(marker.time_ms / 1000)}</Text>
    <Text style={{ flex: 1, ...font.body(12), color: colors.textPrimary }}>{marker.note || t('coach.videoFeedback.marker')}</Text>
    {marker.annotation_url ? <MaterialCommunityIcons name="pencil" size={11} color={colors.gold500} accessible={false} /> : null}
  </>;
  return marker.annotation_url ? <Pressable accessibilityRole="button" testID="coach.video.marker.annotation" onPress={select} style={style}>{label}</Pressable>
    : <View style={style}>{label}</View>;
}
