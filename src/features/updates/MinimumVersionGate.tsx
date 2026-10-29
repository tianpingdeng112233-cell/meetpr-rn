import { useEffect, useState, type PropsWithChildren } from 'react';
import { BackHandler, Image, Linking, Platform, ScrollView, Text, View } from 'react-native';
import * as Application from 'expo-application';
import { font, fontMetrics, palette, radius, Screen, spacing, useColors } from '@/design';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { checkMinimumAndroidVersion } from './minimum-version';

/** Show the app immediately; replace it only after a confirmed below-minimum response. */
export function MinimumVersionGate({ children }: PropsWithChildren) {
  const colors = useColors();
  const [minimum, setMinimum] = useState<number | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const controller = new AbortController();
    void checkMinimumAndroidVersion(Application.nativeBuildVersion, controller.signal).then(value => {
      if (!controller.signal.aborted) setMinimum(value);
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (minimum == null) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [minimum]);
  if (minimum === null) return <>{children}</>;
  return <Screen>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, gap: spacing.xl }}>
      <Image source={require('../../../assets/images/icon.png')} accessibilityLabel="MeetPR" style={{ width: 72, height: 72, borderRadius: 18 }} />
      <Text accessibilityRole="header" style={{ ...font.display(fontMetrics.size30), color: colors.textPrimary }}>{t('minimumVersion.title')}</Text>
      <Text style={{ ...font.body(fontMetrics.size16), lineHeight: 26, color: colors.textSecondary }}>{t('minimumVersion.body')}</Text>
      <View style={{ padding: spacing.lg, gap: spacing.lg, borderRadius: radius.card, backgroundColor: palette.surfaceCard.light }}>
        {[
          [t('minimumVersion.current'), t('minimumVersion.currentValue', [Application.nativeApplicationVersion ?? '—', Application.nativeBuildVersion ?? '—'])],
          // The endpoint supplies only min_build; never invent a minimum version name.
          [t('minimumVersion.minimum'), t('minimumVersion.minimumValue', [minimum])],
        ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
          <Text style={{ ...font.body(fontMetrics.size14), color: palette.textSecondary.light }}>{label}</Text>
          <Text style={{ ...font.mono(fontMetrics.size14), color: palette.textPrimary.light }}>{value}</Text>
        </View>)}
      </View>
      <View style={{ flex: 1 }} />
      {downloadFailed ? <Text accessibilityLiveRegion="polite" style={{ ...font.body(fontMetrics.size13), color: colors.danger }}>{t('minimumVersion.openFailed')}</Text> : null}
      <FeedbackPressable accessibilityRole="button" accessibilityLabel={t('minimumVersion.download')} onPress={() => {
        setDownloadFailed(false);
        void Linking.openURL('https://dl.meetpr.cn').catch(() => setDownloadFailed(true));
      }} style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card, backgroundColor: colors.ctaFill }}>
        <Text style={{ ...font.body(fontMetrics.size16, 'bold'), color: colors.inkOnCTAFill }}>{t('minimumVersion.download')}</Text>
      </FeedbackPressable>
    </ScrollView>
  </Screen>;
}
