import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { PropsWithChildren } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import type { GrowthSourceDetail } from './source-detail';

const number = (value: number) => value.toLocaleString(getLocale(), { maximumFractionDigits: 4 });

export function GrowthSourceSheet({ detail, onClose }: { detail: GrowthSourceDetail | null; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const point = detail?.point;
  const calculation = detail?.calculation;
  const body = { ...font.body(12), color: colors.textSecondary };
  const note = { ...font.body(11), color: colors.textMuted };
  const badge = point?.confidence === 'low' ? 'student.e1rmSourceLow' : point?.origin === 'imported' ? 'student.e1rmSourceImported' : 'student.e1rmSourceDailyBest';
  return <Modal transparent visible={detail !== null} animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <Pressable feedback="none" accessibilityLabel={t('student.e1rmSourceClose')} onPress={onClose} style={{ flex: 1 }} />
      <View accessibilityViewIsModal style={{ maxHeight: '90%', backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20), gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...font.body(19, 'bold'), color: colors.textPrimary }}>{t('student.e1rmSourceTitle')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('student.e1rmSourceClose')} onPress={onClose} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          {point && detail ? <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={body}>{point.computedAt.toLocaleDateString(getLocale(), { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
              <Text style={{ ...font.body(10, 'semibold'), color: colors.goldText, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 }}>{t(badge)}</Text>
            </View>
            <Text style={{ ...font.mono(38, 'bold'), color: colors.textPrimary }}>{point.e1RMKg.toFixed(1)} <Text style={{ ...font.mono(15), color: colors.textMuted }}>kg</Text></Text>
            <SourceBlock title={t('student.e1rmSourceLabel')}>
              <Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary }}>{detail.exerciseName ?? t('student.e1rmSourceMissingExercise')}{detail.setNumber === null ? '' : ` · ${t('student.e1rmSourceSet', [detail.setNumber])}`}</Text>
              {detail.setNumber === null ? <Text style={note}>{t('student.e1rmSourceMissingSet')}</Text> : null}
            </SourceBlock>
            <SourceBlock title={t('student.e1rmSourceRecord')}>
              <Text style={{ ...font.mono(22, 'semibold'), color: colors.textPrimary }}>{number(point.sourceWeightKg)} kg × {point.sourceReps}</Text>
              <RPERow label={t('student.e1rmSourceStudentRPE')} value={point.sourceRPE} />
              {point.sourceCoachRPE != null ? <RPERow label={t('student.e1rmSourceCoachRPE')} value={point.sourceCoachRPE} /> : null}
            </SourceBlock>
            <SourceBlock title={t('student.e1rmSourceCalculation')}>
              <Text style={body}>{calculation?.kind === 'rts' ? t('student.e1rmSourceRTS', [point.sourceReps, number(calculation.rpe), number(calculation.intensity * 100)]) : t(calculation?.kind === 'epley' ? 'student.e1rmSourceEpley' : 'student.e1rmSourceUnavailable')}</Text>
              {calculation?.kind !== 'unavailable' ? <Text style={{ ...font.mono(16, 'semibold'), color: colors.textPrimary }}>{number(point.sourceWeightKg)}{calculation?.kind === 'rts' ? ` ÷ ${number(calculation.intensity)}` : ` × (1 + ${point.sourceReps} ÷ 30)`} ≈ {point.e1RMKg.toFixed(1)} kg</Text> : null}
            </SourceBlock>
            <Text style={note}>{t(point.confidence === 'low' ? 'student.e1rmSourceLowNote' : 'student.e1rmSourceNote')}</Text>
            {point.origin === 'imported' ? <Text style={note}>{t('student.e1rmSourceImportedNote')}</Text> : null}
          </> : null}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function SourceBlock({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useColors();
  return <View style={{ padding: 12, gap: 8, backgroundColor: colors.surfaceRaised, borderRadius: radius.control }}>
    <Text style={{ ...font.body(11), color: colors.textMuted }}>{title}</Text>{children}
  </View>;
}
function RPERow({ label, value }: { label: string; value: number | null }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text style={{ ...font.body(12), color: colors.textSecondary }}>{label}</Text>
    <Text style={{ ...font.mono(12), color: colors.textPrimary }}>{value === null ? t('student.e1rmSourceNoRPE') : number(value)}</Text>
  </View>;
}
