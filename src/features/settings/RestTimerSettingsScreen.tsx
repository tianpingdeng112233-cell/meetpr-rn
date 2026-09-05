import { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@/i18n';
import { ProfileModal, ProfileText, PreferenceChip, MyProfileValueRow } from '@/features/profile/components';
import { clampRestSeconds, defaultCustomRest, durationText, type RestTimerPreference } from './rest-timer';
import { preferenceKeys, writeRestPreference } from './storage';
export function RestTimerSettingsScreen({ studentId, initial, onClose }: { studentId: string; initial: RestTimerPreference; onClose: () => void }) {
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
  return <ProfileModal title={t('student.restTimerSettingsView.copy004')} onClose={onClose} busy={busy}>
    <ProfileText>{t('student.restTimerSettingsView.copy008')}</ProfileText>
    <View style={{ gap: 10 }}><PreferenceChip disabled={busy} label={t('student.studentRestTimerSettings.copy001')} selected={preference.mode === 'automatic'} onPress={() => void change({ mode: 'automatic' })} />
      <PreferenceChip disabled={busy} label={t('student.restTimerSettingsView.copy001')} selected={preference.mode === 'custom'} onPress={() => void change(defaultCustomRest)} /></View>
    {preference.mode === 'custom' ? ([['low', 'student.restTimerSettingsView.copy005'], ['mid', 'student.restTimerSettingsView.copy006'], ['high', 'student.restTimerSettingsView.copy007']] as const).map(([band, key]) => <View key={band}>
      <MyProfileValueRow title={t(key)} value={durationText(preference[band])} onPress={() => setExpanded(expanded === band ? null : band)} />
      <ProfileText>{t(expanded === band ? 'student.restTimerSettingsView.copy009' : 'student.restTimerSettingsView.copy010')}</ProfileText>
      {expanded === band ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: 39 }, (_, i) => i * 15 + 30).map((seconds) => <PreferenceChip disabled={busy} key={seconds} label={durationText(seconds)} selected={preference[band] === seconds} onPress={() => void change({ ...preference, [band]: clampRestSeconds(seconds) })} />)}</View> : null}
    </View>) : <><ProfileText>{t('student.restTimerSettingsView.copy002')}</ProfileText>{(['student.restTimerSettingsView.copy005', 'student.restTimerSettingsView.copy006', 'student.restTimerSettingsView.copy007'] as const).map((key, index) => <ProfileText key={key}>{t(key)} · {t((['student.restTimerSettingsView.copy011', 'student.restTimerSettingsView.copy012', 'student.restTimerSettingsView.copy013'] as const)[index])}</ProfileText>)}</>}
    <ProfileText>{t('student.restTimerSettingsView.copy003')}</ProfileText>
    {error ? <ProfileText error>{error}</ProfileText> : null}
  </ProfileModal>;
}
