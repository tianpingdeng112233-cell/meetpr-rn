import { useState } from 'react';
import { Linking, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { Card, font, radius, useColors } from '@/design';
import { t } from '@/i18n';
import { ProfileSheet, ProfileText, profileStyles } from './ProfileComponents';

export function CoachHelpFeedbackSheet({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  return <ProfileSheet title={t('coach.profile.help')} subtitle={t('coach.profile.helpSubtitle')} onClose={onClose}>
    <Card style={{ padding: 0 }}>
      {(['join', 'feedback', 'video', 'unbind'] as const).map((topic, index) => <View key={topic}
        style={{ padding: 16, gap: 9, borderTopWidth: index ? 1 : 0, borderColor: colors.borderHairline }}>
        <ProfileText style={font.body(15, 'semibold')}>{t(`coach.profile.faq.${topic}.question`)}</ProfileText>
        <ProfileText style={{ ...font.body(13), color: colors.textTertiary, lineHeight: 22 }}>{t(`coach.profile.faq.${topic}.answer`)}</ProfileText>
      </View>)}
    </Card>
    <View accessible accessibilityRole="text" accessibilityState={{ disabled: true }} testID="coach.profile.contactUnavailable"
      style={{ opacity: 0.35, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, padding: 14, alignItems: 'center' }}>
      <ProfileText style={font.body(14, 'semibold')}>{t('coach.profile.contactUs')}</ProfileText>
    </View>
    <ProfileText style={{ ...font.body(12), color: colors.textTertiary, textAlign: 'center' }}>{t('coach.profile.contactHours')}</ProfileText>
  </ProfileSheet>;
}

export function CoachPrivacyTermsSheet({ onClose, privacyPolicyURL }: { onClose: () => void; privacyPolicyURL?: string | null }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  return <ProfileSheet title={t('coach.profile.privacyAndTerms')} subtitle={t('coach.profile.privacyAndTermsSubtitle')} onClose={onClose}>
    <Card style={{ padding: 0 }}>
      {(['userAgreement', 'privacyPolicy', 'studentDataUsage'] as const).map((document, index) => {
        const enabled = document === 'privacyPolicy' && !!privacyPolicyURL;
        const content = <>
          <ProfileText style={{ flex: 1, color: enabled || document === 'studentDataUsage' ? colors.textPrimary : colors.textDisabled }}>{t(`coach.profile.${document}`)}</ProfileText>
          <ProfileText style={{ ...font.mono(11), color: colors.textDisabled }}>{t('coach.profile.documentDate')}</ProfileText>
        </>;
        const style = [profileStyles.row, { borderTopWidth: index ? 1 : 0, borderColor: colors.borderHairline }];
        return enabled ? <Pressable key={document} testID="coach.profile.privacyPolicy" accessibilityRole="link" style={style}
          onPress={() => { setFailed(false); void Linking.openURL(privacyPolicyURL!).catch(() => setFailed(true)); }}>{content}</Pressable>
          : <View key={document} accessible accessibilityRole="text" testID={`coach.profile.${document}${document !== 'studentDataUsage' ? '.unavailable' : ''}`} style={style}>{content}</View>;
      })}
    </Card>
    {failed ? <ProfileText accessibilityRole="alert" style={{ color: colors.danger }}>{t('coach.invites.operationFailed')}</ProfileText> : null}
    <ProfileText style={{ ...font.body(13), color: colors.textTertiary, lineHeight: 22 }}>{t('coach.profile.studentDataDescription')}</ProfileText>
  </ProfileSheet>;
}
