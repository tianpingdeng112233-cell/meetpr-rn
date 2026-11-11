import { useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { AppButton, font, useColors } from '@/design';
import { t } from '@/i18n';
import type { ExerciseRef } from '@/api/domains/chat';
import { enqueueExerciseNote, exerciseNoteBody } from './exercise-note-outbox';
import { showToast } from '@/design/Toast';

export function ExerciseNoteSheet({ studentId, coachId, reference, onClose }: { studentId: string; coachId: string; reference: ExerciseRef; onClose: () => void }) {
  const colors = useColors();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.numberPadScrim }}>
      <View style={{ padding: 20, gap: 16, borderRadius: 20, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.surfaceCard }}>
        <Text style={{ ...font.body(18, 'bold'), color: colors.textPrimary }}>{t('training.allDay.note', [reference.exercise_name])}</Text>
        <TextInput multiline autoFocus value={text} onChangeText={setText} placeholder={t('training.allDay.notePlaceholder')} placeholderTextColor={colors.textMuted} maxLength={4000 - exerciseNoteBody(reference, '').length} style={{ minHeight: 110, color: colors.textPrimary, ...font.body(16), textAlignVertical: 'top' }} />
        {error ? <Text style={{ color: colors.danger }}>{t('chat.sendFailed')}</Text> : null}
        <AppButton label={t('training.allDay.send')} disabled={sending || !text.trim()} onPress={() => {
          setSending(true); setError(false);
          void enqueueExerciseNote(studentId, coachId, reference, text).then(() => { onClose(); showToast(t('training.allDay.noteSent'), true); }).catch(() => setError(true)).finally(() => setSending(false));
        }} />
        <AppButton variant="link" label={t('designSystem.action.cancel')} onPress={onClose} />
      </View>
    </View>
  </Modal>;
}
