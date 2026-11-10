import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBodyWeights } from '@/api/domains/body-weights';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import { font, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { BodyWeightSheet } from '@/features/history/BodyWeightSheet';
import { useDailyWeight } from '@/features/settings/daily-weight';
import { t } from '@/i18n';
import { weightStripModel } from './weight-strip-model';

export function MeetWeightStrip({ studentId, profile, today }: { studentId: string; profile?: OnboardingProfile | null; today: string }) {
  const colors = useColors();
  const router = useRouter();
  const setting = useDailyWeight(studentId);
  const weights = useBodyWeights(studentId);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const model = weightStripModel({ today, settingOn: setting.data === true,
    meet: profile?.is_competing && profile.competition_date ? { date: profile.competition_date } : null,
    todayRecord: weights.data?.records.find(record => record.recorded_on === today) ?? null });
  if (model.kind === 'hidden') return null;
  const value = editing && preview !== null ? preview : model.weight;
  return <>
    <View testID="training.meetWeightStrip" style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.borderHairline, backgroundColor: colors.surfaceCard, flexDirection: 'row', overflow: 'hidden' }}>
      {model.kind === 'meet-weight' ? <Pressable accessibilityRole="button" accessibilityLabel={model.days === 0 ? t('student.weightStrip.meetToday') : t('student.weightStrip.untilMeet', [model.days])} onPress={() => router.navigate({ pathname: '/(student)/profile', params: { edit: 'competition' } })} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: colors.borderHairline }}>
        <MaterialCommunityIcons name="flag-outline" size={16} color={colors.textSecondary} />
        <Text style={{ flex: 1, ...font.body(15, 'bold'), fontVariant: ['tabular-nums'], color: colors.textPrimary }}>{model.days === 0 ? t('student.weightStrip.meetToday') : t('student.weightStrip.untilMeet', [model.days])}</Text>
      </Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={model.weight ? `${t('student.weightStrip.today')} ${model.weight} kg` : t('student.weightStrip.log')} onPress={() => { setPreview(null); setEditing(true); }} style={{ flex: 1, minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <Text style={{ ...font.body(12), color: colors.textSecondary, flexShrink: 1 }}>{t('student.weightStrip.today')}</Text>
        {value != null ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}><Text style={{ ...font.mono(15, 'bold'), color: editing ? colors.goldText : colors.textPrimary }}>{value}</Text><Text style={{ ...font.body(12), color: colors.textSecondary }}>kg</Text></View>
          : <View style={{ minHeight: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.goldSoft, justifyContent: 'center' }}><Text style={{ ...font.body(13, 'semibold'), color: colors.goldText }}>{t('student.weightStrip.log')}</Text></View>}
      </Pressable>
    </View>
    {editing ? <BodyWeightSheet studentId={studentId} onPreview={setPreview} onClose={() => { setEditing(false); setPreview(null); }} /> : null}
  </>;
}
