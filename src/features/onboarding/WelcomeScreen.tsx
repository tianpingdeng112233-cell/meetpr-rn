import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { AnalyticsEvent, track } from '@/analytics';
import { AppButton, Screen, font, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import { firstRunStorage } from './first-run-storage';

export function welcomeCoachName(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return t('student.firstRun.coach');
  return getLocale() === 'en' || /教练|教練/.test(trimmed) ? trimmed : t('student.firstRun.coachName', [trimmed]);
}

export function WelcomeScreen({ studentId, bindingId, coachName, avatarUrl, onContinue }: {
  studentId: string; bindingId: string; coachName: string | null; avatarUrl?: string | null; onContinue: () => void;
}) {
  const colors = useColors();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { void track(AnalyticsEvent.BindWelcomeViewed); }, []);
  const enter = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await firstRunStorage.mark(studentId, bindingId, 'welcomeSeen');
      void track(AnalyticsEvent.BindWelcomeContinue);
      onContinue();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };
  return <Screen>
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 24, gap: 32 }}>
      {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} /> :
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.gold500, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...font.body(28, 'bold'), color: colors.goldText }}>{Array.from(coachName?.trim() || t('student.firstRun.coach'))[0]}</Text>
        </View>}
      <View style={{ gap: 10 }}>
        <Text style={{ ...font.mono(13), color: colors.goldText }}>{t('student.firstRun.welcome.eyebrow')}</Text>
        <Text style={{ ...font.display(32), color: colors.textPrimary }}>{t('student.firstRun.welcome.title', [welcomeCoachName(coachName)])}</Text>
      </View>
      <View>
        {([1, 2, 3] as const).map(step => <View key={step} style={{ flexDirection: 'row', gap: 14, paddingVertical: 14 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ctaBackground, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...font.mono(13, 'bold'), color: colors.ctaText }}>{step}</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{t(`student.firstRun.welcome.step${step}`)}</Text>
            <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t(`student.firstRun.welcome.detail${step}`)}</Text>
          </View>
        </View>)}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 12 }}>
        {failed ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{t('student.firstRun.saveError')}</Text> : null}
        <AppButton label={t('student.firstRun.welcome.continue')} style={{ minHeight: 56 }} labelStyle={font.body(18, 'bold')} loading={saving} onPress={() => void enter()} />
      </View>
    </ScrollView>
  </Screen>;
}
