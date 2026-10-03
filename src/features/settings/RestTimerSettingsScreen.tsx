import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { font, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SettingsPage, SettingsSectionTitle } from './SettingsPage';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@/i18n';
import { ProfileText, MyProfileGroupCard, MyProfileDivider } from '@/features/profile/components';
import { clampRestSeconds, defaultCustomRest, durationText, type RestTimerPreference } from './rest-timer';
import { preferenceKeys, writeRestPreference } from './storage';
export function RestTimerSettingsScreen({ studentId, initial, onClose }: { studentId: string; initial: RestTimerPreference; onClose: () => void }) {
  const colors = useColors();
  const [preference, setPreference] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const change = async (next: RestTimerPreference) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await writeRestPreference(studentId, next); setPreference(next); client.setQueryData(preferenceKeys.rest(studentId), next); }
    catch { setError(t('student.myProfileViewModel.copy002')); }
    finally { setBusy(false); }
  };
  const bands = [['low', 'student.restTimerSettingsView.copy005'], ['mid', 'student.restTimerSettingsView.copy006'], ['high', 'student.restTimerSettingsView.copy007']] as const;
  return <SettingsPage title={t('student.restTimerSettingsView.copy004')} onClose={onClose} busy={busy}>
    <MyProfileGroupCard><View style={{ padding: 16, gap: 12 }}>
      <SettingsSectionTitle>{t('student.restTimerSettingsView.copy008')}</SettingsSectionTitle>
      <View style={{ flexDirection: 'row', backgroundColor: colors.bgInset, borderRadius: 10, padding: 3 }}>
        {(['automatic', 'custom'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: preference.mode === mode, disabled: busy }} disabled={busy}
          onPress={() => { setExpanded(null); void change(mode === 'automatic' ? { mode } : defaultCustomRest); }}
          style={{ flex: 1, minHeight: 44, padding: 6, justifyContent: 'center', borderRadius: 8, backgroundColor: preference.mode === mode ? colors.surfaceCard : 'transparent' }}>
          <Text style={{ textAlign: 'center', ...font.body(12, 'semibold'), color: colors.textPrimary }}>{t(mode === 'automatic' ? 'student.studentRestTimerSettings.copy001' : 'student.studentRestTimerSettings.copy003')}</Text>
        </Pressable>)}
      </View>
    </View></MyProfileGroupCard>
    {preference.mode === 'custom' ? <View style={{ gap: 8 }}>
      <SettingsSectionTitle>{t('student.restTimerSettingsView.copy001')}</SettingsSectionTitle>
      <MyProfileGroupCard>{bands.map(([band, key], index) => <View key={band}>
        {index > 0 ? <MyProfileDivider /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t(key)} accessibilityState={{ expanded: expanded === band }} accessibilityHint={t(expanded === band ? 'student.restTimerSettingsView.copy009' : 'student.restTimerSettingsView.copy010')}
          onPress={() => setExpanded(expanded === band ? null : band)} style={{ minHeight: 56, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, ...font.body(15, 'semibold'), color: colors.textPrimary }}>{t(key)}</Text>
          <Text style={{ ...font.mono(14, 'semibold'), color: colors.goldText }}>{durationText(preference[band])}</Text>
          <MaterialCommunityIcons name={expanded === band ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
        </Pressable>
        {expanded === band ? <ScrollView nestedScrollEnabled style={{ height: 150, backgroundColor: colors.surfaceRaised }} contentOffset={{ x: 0, y: Math.max(0, (preference[band] - 30) / 15 - 1) * 44 }}>
          {Array.from({ length: 39 }, (_, i) => i * 15 + 30).map(seconds => <Pressable key={seconds} accessibilityRole="button" accessibilityLabel={durationText(seconds)} accessibilityState={{ selected: preference[band] === seconds, disabled: busy }} disabled={busy}
            onPress={() => void change({ ...preference, [band]: clampRestSeconds(seconds) })} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...font.mono(16, preference[band] === seconds ? 'semibold' : 'regular'), color: preference[band] === seconds ? colors.goldText : colors.textSecondary }}>{durationText(seconds)}</Text>
          </Pressable>)}
        </ScrollView> : null}
      </View>)}</MyProfileGroupCard>
    </View> : null}
    <View style={{ gap: 8 }}><SettingsSectionTitle>{t('student.restTimerSettingsView.copy002')}</SettingsSectionTitle>
      <MyProfileGroupCard>{bands.map(([, key], index) => <View key={key}>
        {index > 0 ? <MyProfileDivider /> : null}
        <View style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, ...font.body(14, 'medium'), color: colors.textSecondary }}>{t(key)}</Text>
          <Text style={{ ...font.mono(13, 'semibold'), color: colors.textPrimary }}>{t((['student.restTimerSettingsView.copy011', 'student.restTimerSettingsView.copy012', 'student.restTimerSettingsView.copy013'] as const)[index])}</Text>
        </View>
      </View>)}</MyProfileGroupCard>
    </View>
    <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('student.restTimerSettingsView.copy003')}</Text>
    {error ? <ProfileText error>{error}</ProfileText> : null}
  </SettingsPage>;
}
