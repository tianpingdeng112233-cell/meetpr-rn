import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { PRIVACY_POLICY_URL } from '@/analytics/PrivacyNoticeSheet';
import { useSessionStore } from '@/api/session';
import { Card, Screen, font, radius, useColors } from '@/design';
import { t } from '@/i18n';
import { CoachHelpFeedbackSheet, CoachPrivacyTermsSheet } from './CoachProfileSheets';
import { Capsule, Confirmation, ProfileText, profileStyles } from './ProfileComponents';
import { inviteCardState } from './invite-card-state';
import { useInviteCodes, type InviteDependencies } from './use-invite-codes';

export function CoachMyProfileScreen(dependencies: InviteDependencies = {}) {
  const colors = useColors();
  const router = useRouter();
  const user = useSessionStore(state => state.user);
  const logout = useSessionStore(state => state.logout);
  const { snapshot, model, now } = useInviteCodes(dependencies);
  const { code, subtitle } = inviteCardState(snapshot);
  const [overlay, setOverlay] = useState<'help' | 'privacy' | 'logout' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    // Session.logout clears identity immediately; RootNavigator owns the redirect.
    try { await logout(); } catch { /* Existing logout path also tolerates SecureStore cleanup failure. */ }
    finally { setLoggingOut(false); setOverlay(null); }
  };

  return <Screen edges={['top', 'left', 'right']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={profileStyles.content}
      refreshControl={<RefreshControl refreshing={snapshot.refreshing} onRefresh={() => void model.reload()} tintColor={colors.gold500} colors={[colors.gold500]} />}>
      <ProfileText accessibilityRole="header" style={font.display(34)}>{t('coach.profile.title')}</ProfileText>
      <Card><ProfileText testID="coach.profile.displayName" style={font.body(17, 'bold')}>{user?.name?.trim() || t('coach.profile.fallbackName')}</ProfileText></Card>
      <Card style={{ padding: 0 }}>
        <Pressable testID="coach.profile.inviteCard" accessibilityRole="button" onPress={() => router.push('/(coach)/invite-codes')}
          style={({ pressed }) => [{ padding: 16, gap: 10 }, pressed && { transform: [{ scale: 0.98 }] }]}>
          <ProfileText style={{ ...font.body(12, 'semibold'), color: colors.gold500, paddingRight: code ? 74 : 0 }}>{t('coach.profile.permanentInvite')}</ProfileText>
          {code ? <>
            <ProfileText numberOfLines={1} adjustsFontSizeToFit style={{ ...font.mono(26, 'bold'), letterSpacing: 26 * 0.14, marginTop: 10 }}>{code.code}</ProfileText>
            <ProfileText style={{ ...font.body(12), color: colors.textTertiary }}>{t('coach.profile.inviteUsage %lld', [code.used_count])}</ProfileText>
          </> : <ProfileText style={{ ...font.body(12), color: colors.textTertiary }}>{t(subtitle)}</ProfileText>}
        </Pressable>
        {code ? <Pressable testID="coach.profile.copyInvite" accessibilityRole="button" accessibilityLabel={t('coach.profile.copyInvite')} onPress={() => void model.copyCode(code.id, now)}
          style={({ pressed }) => [{ position: 'absolute', top: 6, right: 16, minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.inset }, pressed && { transform: [{ scale: 0.95 }] }]}>
          <ProfileText style={font.body(12, 'semibold')}>{t('coach.profile.copy')}</ProfileText>
        </Pressable> : null}
      </Card>
      {snapshot.actionError ? <ProfileText accessibilityRole="alert" style={{ color: colors.danger }}>{t('coach.invites.operationFailed')}</ProfileText> : null}
      <ProfileText style={{ ...font.mono(12), color: colors.textTertiary, marginTop: 10 }}>{t('coach.profile.general')}</ProfileText>
      <Card style={{ padding: 0 }}>
        {(['help', 'privacyAndTerms'] as const).map((key, index) => <Pressable key={key} accessibilityRole="button" testID={key === 'help' ? 'coach.profile.help' : 'coach.profile.privacyTerms'}
          onPress={() => setOverlay(key === 'help' ? 'help' : 'privacy')} style={[profileStyles.row, { borderTopWidth: index ? 1 : 0, borderColor: colors.borderHairline }]}>
          <ProfileText style={{ flex: 1 }}>{t(`coach.profile.${key}`)}</ProfileText><ProfileText style={{ color: colors.textDisabled }}>›</ProfileText>
        </Pressable>)}
        <View testID="coach.profile.appVersion" accessible accessibilityRole="text" style={[profileStyles.row, { borderTopWidth: 1, borderColor: colors.borderHairline }]}>
          <ProfileText style={{ flex: 1 }}>{t('coach.profile.appVersion')}</ProfileText>
          <ProfileText style={{ ...font.mono(13), color: colors.textTertiary }}>{t('coach.profile.appVersionValue').replace('{version}', Constants.expoConfig?.version ?? '0.1').replace('{channel}', t('coach.profile.internalBeta'))}</ProfileText>
        </View>
      </Card>
      <Capsule danger label={t('coach.profile.logout')} onPress={() => setOverlay('logout')} testID="coach.profile.logout" />
    </ScrollView>
    {snapshot.copiedCodeID ? <View pointerEvents="none" style={{ position: 'absolute', bottom: 20, left: 28, right: 28, alignItems: 'center' }}>
      <ProfileText testID="coach.profile.toast" accessibilityLiveRegion="polite" style={{ ...font.body(13, 'semibold'), backgroundColor: colors.textPrimary, color: colors.surfaceCard, paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.control }}>{t('coach.profile.copied')}</ProfileText>
    </View> : null}
    {overlay === 'help' ? <CoachHelpFeedbackSheet onClose={() => setOverlay(null)} /> : null}
    {overlay === 'privacy' ? <CoachPrivacyTermsSheet privacyPolicyURL={PRIVACY_POLICY_URL} onClose={() => setOverlay(null)} /> : null}
    {overlay === 'logout' ? <Confirmation testID="coach.profile.logout" title={t('coach.profile.logoutTitle')} message={t('coach.profile.logoutMessage')}
      cancelLabel={t('coach.profile.cancel')} confirmLabel={t(loggingOut ? 'coach.profile.loggingOut' : 'coach.profile.confirmLogout')} busy={loggingOut}
      onCancel={() => setOverlay(null)} onConfirm={() => void signOut()} /> : null}
  </Screen>;
}
