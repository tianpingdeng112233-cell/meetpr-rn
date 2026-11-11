import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useBodyWeights, useSaveBodyWeight } from '@/api/domains/body-weights';
import { font, useColors } from '@/design';
import { NumberPad } from '@/design/NumberPad';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { getLocale, t } from '@/i18n';

export function BodyWeightSheet({ studentId, onClose, onPreview }: { studentId: string; onClose: () => void; onPreview?: (text: string) => void }) {
  const colors = useColors();
  const records = useBodyWeights(studentId).data?.records ?? [];
  const last = [...records].sort((a, b) => b.recorded_on.localeCompare(a.recorded_on))[0];
  const save = useSaveBodyWeight(studentId);
  const [error, setError] = useState(false);
  const close = () => { if (!save.isPending) onClose(); };
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <View style={{ flex: 1 }} accessibilityViewIsModal>
      <Pressable feedback="none" accessibilityRole="button" accessibilityLabel={t('student.weightStrip.dismiss')} disabled={save.isPending} onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: colors.numberPadScrim }]} />
      <NumberPad layout="bodyWeight" field="weight" initialValue={last ? Number(last.weight_kg).toFixed(1) : ''} disabled={save.isPending}
        commitTitle={t('student.weightStrip.done')} onCancel={close} onChangeText={onPreview}
        onCommit={async value => { setError(false); try { await save.mutateAsync(value.toFixed(2)); onClose(); } catch { setError(true); } }}
        header={text => <View style={{ gap: 12 }}>
          <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ ...font.body(17, 'bold'), color: colors.textPrimary }}>{t('student.weightStrip.panelTitle')}</Text>
            <Text style={{ ...font.body(12), color: colors.textSecondary }}>{new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date())}</Text>
          </View>
          <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: colors.goldText, padding: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ ...font.mono(40, 'bold'), color: colors.textPrimary }}>{text || '—'}</Text><View style={{ width: 2, height: 36, backgroundColor: colors.goldText }} /><Text style={{ ...font.body(15), color: colors.textSecondary }}>kg</Text>
            {last ? <Text style={{ flexGrow: 1, textAlign: 'right', ...font.body(12), color: colors.textSecondary }}>{t('student.weightStrip.last', [Number(last.weight_kg).toFixed(1), last.recorded_on.slice(5).replace('-', '/')])}</Text> : null}
          </View>
          <Text style={{ ...font.body(12), color: colors.textSecondary }}>{t('student.weightStrip.explanation')}</Text>
          {error ? <Text accessibilityRole="alert" style={{ ...font.body(13), color: colors.danger }}>{t('student.myProfileViewModel.copy002')}</Text> : null}
        </View>} />
    </View>
  </Modal>;
}
