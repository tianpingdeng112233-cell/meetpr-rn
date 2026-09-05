import { Fragment } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import { font, useColors } from '@/design';
import { t } from '@/i18n';
import { oneRMValues } from './model';

export function MyProfileOneRMCard({ profile }: { profile: OnboardingProfile }) {
  const colors = useColors();
  const values = oneRMValues(profile);
  return <View style={{ padding: 16, backgroundColor: colors.surfaceCard, borderRadius: 16 }}>
    <View style={{ height: 44, marginTop: -10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ ...font.body(13, 'semibold'), color: colors.textSecondary }}>{t('student.myProfileView.copy018')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.myProfileView.copy019')} onPress={() => Alert.alert(t('student.myProfileView.copy019'), t('student.myProfileView.copy020'))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="information-outline" size={14} color={colors.textMuted} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <MaterialCommunityIcons name="lock-outline" size={15} color={colors.textDim} />
    </View>
    <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
      {(['coach.planning.lift.squat', 'coach.planning.lift.benchPress', 'coach.planning.lift.deadlift'] as const).map((key, index) => <View key={key} style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...font.body(10), color: colors.textMuted }}>{t(key)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={{ flexShrink: 1, ...font.mono(26, 'bold'), color: colors.textPrimary }}>{values.lifts[index]}</Text>
          <Text style={{ ...font.mono(11), color: colors.textMuted }}>kg</Text>
        </View>
      </View>)}
    </View>
    <View style={{ marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderColor: colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ ...font.mono(12, 'semibold'), letterSpacing: 0.36, color: colors.textSecondary }}>{t('student.myProfileView.copy021')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ ...font.mono(24, 'bold'), color: colors.goldText }}>{values.total}</Text>
        <Text style={{ ...font.mono(12, 'semibold'), color: colors.goldText, opacity: 0.7 }}>kg</Text>
      </View>
    </View>
    <View style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialCommunityIcons name="lock-outline" size={11} color={colors.textDim} />
      <Text style={{ flex: 1, ...font.body(11), color: colors.textDim }}>{t('student.myProfileView.copy022')}</Text>
    </View>
  </View>;
}

/** Shared by the readiness hero and the two rows in the v2 recovery group. */
export function MyProfileRecoveryRow({ title, chips, injury = false, onPress }: { title: string; chips: readonly string[]; injury?: boolean; onPress: () => void }) {
  const colors = useColors();
  const foreground = injury ? colors.dangerMuted : colors.textSecondary;
  const summaries = chips.length ? chips.slice(0, 3) : [t('student.myProfileV3Presentation.copy010')];
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingHorizontal: 16, paddingVertical: 14, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <Text style={{ ...font.body(14, 'semibold'), color: colors.textPrimary }}>{title}</Text>
        <Text style={{ ...font.body(10, 'medium'), color: colors.goldText, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: `${colors.goldRGB}59`, backgroundColor: `${colors.goldRGB}1F` }}>{t('student.myProfileView.copy023')}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {summaries.map((chip, index) => <Fragment key={`${index}-${chip}`}>
          {index > 0 && !injury ? <View style={{ width: 1, height: 11, backgroundColor: colors.borderStrong }} /> : null}
          <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: injury ? `${colors.dangerRGB}1A` : colors.borderSubtle, ...(injury ? { borderWidth: 1, borderColor: `${colors.dangerRGB}66` } : {}) }}>
            {injury ? <MaterialCommunityIcons name="alert-outline" size={12} color={foreground} /> : null}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, ...font.body(12, 'semibold'), color: foreground }}>{chip}</Text>
          </View>
        </Fragment>)}
      </View>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={15} color={colors.textDim} />
  </Pressable>;
}
