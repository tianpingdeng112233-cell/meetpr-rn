import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CreateInviteCodeRequest } from '@/api/domains/invite-codes';
import { AppButton, TextField, font, radius, useColors } from '@/design';
import { t } from '@/i18n';
import { Capsule, ProfileText, profileStyles } from './ProfileComponents';

export function CreateInviteCodeSheet({ type, busy, failed, onClose, onCreate }: {
  type: 'single_use' | 'time_limited'; busy: boolean; failed: boolean;
  onClose: () => void; onCreate: (input: CreateInviteCodeRequest) => Promise<boolean>;
}) {
  const colors = useColors();
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState<'sevenDays' | 'thirtyDays' | 'custom'>('sevenDays');
  const [customDays, setCustomDays] = useState(14);
  const days = expiry === 'sevenDays' ? 7 : expiry === 'thirtyDays' ? 30 : customDays;
  const create = async () => {
    if (await onCreate({ type, label, ...(type === 'time_limited' ? { expires_in_days: days } : {}) })) onClose();
  };
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityLabel={t('coach.invites.cancel')} accessibilityRole="button" disabled={busy} onPress={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: `${colors.textPrimary}99` }} />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ maxHeight: '90%', minHeight: '50%', backgroundColor: colors.bgBase, borderTopLeftRadius: radius.modal, borderTopRightRadius: radius.modal }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
          <ProfileText accessibilityRole="header" style={font.display(22)}>{t(type === 'single_use' ? 'coach.invites.createSingleUse' : 'coach.invites.createTimeLimited')}</ProfileText>
          <TextField label={t('coach.invites.optionalLabel')} placeholder={t('coach.invites.labelPlaceholder')} value={label} onChangeText={setLabel} maxLength={100} editable={!busy} />
          {type === 'time_limited' ? <View style={{ gap: 12 }}>
            <ProfileText style={font.body(14, 'semibold')}>{t('coach.invites.validity')}</ProfileText>
            <View style={{ flexDirection: 'row', borderRadius: radius.control, padding: 3, backgroundColor: colors.bgStack }}>
              {(['sevenDays', 'thirtyDays', 'custom'] as const).map(choice => <Pressable key={choice} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: expiry === choice, disabled: busy }}
                onPress={() => setExpiry(choice)} style={{ flex: 1, minHeight: 44, padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: expiry === choice ? colors.surfaceCard : 'transparent', borderRadius: radius.inset }}>
                <ProfileText style={{ ...font.body(12, 'semibold'), textAlign: 'center', color: expiry === choice ? colors.gold500 : colors.textTertiary }}>{t(`coach.invites.${choice}`)}</ProfileText>
              </Pressable>)}
            </View>
            {expiry === 'custom' ? <View style={profileStyles.actions}>
              <ProfileText style={{ flex: 1 }}>{t('coach.invites.days %lld', [customDays])}</ProfileText>
              <Pressable accessibilityRole="button" accessibilityLabel={t('coach.invites.days %lld', [Math.max(1, customDays - 1)])} disabled={busy || customDays <= 1} accessibilityState={{ disabled: busy || customDays <= 1 }}
                onPress={() => setCustomDays(value => Math.max(1, value - 1))} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ProfileText style={{ color: colors.gold500 }}>−</ProfileText></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('coach.invites.days %lld', [Math.min(365, customDays + 1)])} disabled={busy || customDays >= 365} accessibilityState={{ disabled: busy || customDays >= 365 }}
                onPress={() => setCustomDays(value => Math.min(365, value + 1))} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ProfileText style={{ color: colors.gold500 }}>+</ProfileText></Pressable>
            </View> : null}
          </View> : null}
          {failed ? <ProfileText accessibilityRole="alert" style={{ color: colors.danger }}>{t('coach.invites.operationFailed')}</ProfileText> : null}
          <AppButton label={t('coach.invites.generate')} loading={busy} onPress={() => void create()} />
          <Capsule label={t('coach.invites.cancel')} disabled={busy} onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
