import { useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { InviteCode } from '@/api/domains/invite-codes';
import { useSessionStore } from '@/api/session';
import { AppButton, Card, Screen, font, radius, spacing, useColors } from '@/design';
import { InviteCodeFormat } from '@/domain/coach/invite-code-format';
import { inviteCodeStatus, isDefunct, type InviteCodeStatus } from '@/domain/coach/invite-code-status';
import { t } from '@/i18n';
import { CoachNavHeader } from '../CoachNavHeader';
import { CreateInviteCodeSheet } from './CreateInviteCodeSheet';
import { Confirmation, InviteSecondaryButton, ProfileText, profileStyles } from './ProfileComponents';
import { inviteCardState } from './invite-card-state';
import { inviteCopyText, inviteShareTitle, sharesInviteMessage } from './invite-message';
import { useInviteCodes, type InviteDependencies } from './use-invite-codes';

function statusLabel(status: InviteCodeStatus) {
  return status.kind === 'expiringIn' ? t('coach.invites.status.expiresIn %lld', [status.days]) : t(`coach.invites.status.${status.kind}`);
}

export function InviteCodesScreen(dependencies: InviteDependencies = {}) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const createButtonStyle = { flexBasis: spacing.minimumHitTarget * 3 * fontScale, paddingHorizontal: spacing.sm };
  const { snapshot, model, now } = useInviteCodes(dependencies);
  const coachName = useSessionStore(state => state.user?.name);
  const copyText = (code: string) => inviteCopyText(code, coachName);
  const personal = inviteCardState(snapshot).code;
  const secondary = snapshot.codes.filter(code => code.type !== 'personal_permanent');
  const live = secondary.filter(code => !isDefunct(inviteCodeStatus(code, now)));
  const defunct = secondary.filter(code => isDefunct(inviteCodeStatus(code, now)));
  const [sheet, setSheet] = useState<'single_use' | 'time_limited' | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'regenerate' } | { kind: 'revoke'; id: string } | null>(null);
  const confirmMutation = async () => {
    if (!confirm) return;
    if (confirm.kind === 'regenerate') await model.createCode({ type: 'personal_permanent' });
    else await model.revokeCode(confirm.id);
    setConfirm(null);
  };
  const row = (code: InviteCode) => {
    const status = inviteCodeStatus(code, now);
    const inactive = isDefunct(status);
    const content = <Pressable accessibilityRole="button" disabled={inactive || snapshot.mutating} accessibilityState={{ disabled: inactive || snapshot.mutating }}
      accessibilityLabel={`${InviteCodeFormat.grouped(code.code)}, ${statusLabel(status)}`}
      accessibilityActions={inactive ? [] : [{ name: 'revoke', label: t('coach.invites.revoke') }]}
      onAccessibilityAction={event => { if (!snapshot.mutating && event.nativeEvent.actionName === 'revoke') setConfirm({ kind: 'revoke', id: code.id }); }}
      onPress={() => void model.copyCode(code.id, now, copyText)} style={[profileStyles.row, { backgroundColor: colors.surfaceCard }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <ProfileText style={font.mono(14, 'semibold')}>{InviteCodeFormat.grouped(code.code)}</ProfileText>
        <ProfileText style={{ ...font.body(12), color: colors.textTertiary }}>{t(code.type === 'single_use' ? 'coach.invites.singleUse' : 'coach.invites.timeLimited')}{code.label ? ` · ${code.label}` : ''}</ProfileText>
      </View>
      <ProfileText style={{ ...font.body(12), maxWidth: '40%', textAlign: 'right', color: snapshot.copiedCodeID === code.id ? colors.gold500 : colors.textSecondary }}>
        {snapshot.copiedCodeID === code.id ? t('coach.invites.copied') : statusLabel(status)}
      </ProfileText>
    </Pressable>;
    return <View key={code.id} style={{ borderTopWidth: 1, borderColor: colors.borderHairline }}>
      {inactive ? content : <ReanimatedSwipeable enabled={!snapshot.mutating} overshootRight={false} renderRightActions={(_progress, _translation, swipeable) =>
        <Pressable accessibilityRole="button" disabled={snapshot.mutating} onPress={() => { swipeable.close(); setConfirm({ kind: 'revoke', id: code.id }); }}
          style={{ paddingHorizontal: 20, justifyContent: 'center', backgroundColor: colors.danger }}><ProfileText style={{ color: colors.inkOnCTAFill }}>{t('coach.invites.revoke')}</ProfileText></Pressable>
      }>{content}</ReanimatedSwipeable>}
    </View>;
  };

  return <GestureHandlerRootView style={{ flex: 1 }}><Screen edges={['top', 'left', 'right']}>
    <CoachNavHeader title={t('coach.invites.navigationTitle')} trailing={sharesInviteMessage() && personal ?
      <Pressable testID="coach.invites.more" accessibilityRole="button" accessibilityLabel={t('coach.invites.manage')}
        accessibilityState={{ expanded: actionsOpen, disabled: snapshot.mutating }} disabled={snapshot.mutating} onPress={() => setActionsOpen(true)}
        style={{ width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
        <ProfileText style={font.body(24, 'bold')}>…</ProfileText>
      </Pressable> : null} />
    <ScrollView contentContainerStyle={profileStyles.content} refreshControl={<RefreshControl refreshing={snapshot.refreshing} onRefresh={() => void model.reload()} tintColor={colors.gold500} colors={[colors.gold500]} />}>
      <ProfileText style={{ ...font.mono(12), color: colors.textTertiary }}>{t('coach.invites.personalSection')}</ProfileText>
      <Card style={profileStyles.section}>
        {snapshot.state === 'idle' || snapshot.state === 'loading' ? <View style={profileStyles.actions}><ActivityIndicator color={colors.gold500} /><ProfileText>{t('coach.profile.inviteLoading')}</ProfileText></View> : null}
        {personal ? <>
          <ProfileText numberOfLines={1} adjustsFontSizeToFit style={font.mono(28, 'bold')}>{InviteCodeFormat.grouped(personal.code)}</ProfileText>
          <ProfileText style={{ ...font.body(12), color: colors.textSecondary }}>{t('coach.invites.usedCount %lld', [personal.used_count])}</ProfileText>
          {sharesInviteMessage() ? <>
            <AppButton disabled={snapshot.mutating} label={t('coach.invites.shareToStudent')}
              onPress={() => void Share.share({ title: inviteShareTitle(coachName), message: copyText(personal.code) }).catch(() => undefined)} />
            <AppButton variant="secondary" disabled={snapshot.mutating} label={t(snapshot.copiedCodeID === personal.id ? 'coach.invites.copied' : 'coach.invites.copyMessage')}
              onPress={() => void model.copyCode(personal.id, now, copyText)} />
          </> : <View style={profileStyles.actions}>
            <InviteSecondaryButton style={createButtonStyle} disabled={snapshot.mutating} label={t(snapshot.copiedCodeID === personal.id ? 'coach.invites.copied' : 'coach.invites.copy')} onPress={() => void model.copyCode(personal.id, now, copyText)} />
            <InviteSecondaryButton style={createButtonStyle} disabled={snapshot.mutating} label={t('coach.invites.regenerate')} onPress={() => setConfirm({ kind: 'regenerate' })} />
          </View>}
        </> : <>
          <ProfileText style={{ color: colors.textSecondary }}>{t('coach.invites.noPermanentCode')}</ProfileText>
          <AppButton label={t('coach.invites.generatePermanentCode')} loading={snapshot.mutating} disabled={snapshot.state !== 'loaded'} onPress={() => void model.createCode({ type: 'personal_permanent' })} />
        </>}
        {snapshot.actionError || snapshot.state === 'failed' ? <ProfileText accessibilityRole="alert" style={{ color: colors.danger }}>{t('coach.invites.operationFailed')}</ProfileText> : null}
      </Card>
      <ProfileText style={{ ...font.mono(12), color: colors.textTertiary }}>{t('coach.invites.secondarySection')}</ProfileText>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: spacing.base, gap: spacing.point10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <InviteSecondaryButton style={createButtonStyle} disabled={snapshot.mutating} label={t('coach.invites.singleUseCode')} onPress={() => setSheet('single_use')} />
          <InviteSecondaryButton style={createButtonStyle} disabled={snapshot.mutating} label={t('coach.invites.timeLimitedCode')} onPress={() => setSheet('time_limited')} />
        </View>
        {live.map(row)}
      </Card>
      {defunct.length ? <View style={{ gap: 12, opacity: 0.5 }}>
        <ProfileText style={{ ...font.mono(12), color: colors.textTertiary }}>{t('coach.invites.defunctSection')}</ProfileText>
        <Card style={{ padding: 0, overflow: 'hidden' }}>{defunct.map(row)}</Card>
      </View> : null}
    </ScrollView>
    {sharesInviteMessage() && personal && actionsOpen ? <Modal visible transparent animationType="slide" onRequestClose={() => setActionsOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable feedback="none" accessibilityRole="button" accessibilityLabel={t('coach.invites.cancel')} onPress={() => setActionsOpen(false)}
          style={{ position: 'absolute', inset: 0, backgroundColor: colors.modalShadow }} />
        <SafeAreaView accessibilityViewIsModal edges={['bottom', 'left', 'right']}
          style={{ maxHeight: '90%', backgroundColor: colors.bgBase, borderTopLeftRadius: radius.modal, borderTopRightRadius: radius.modal }}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <AppButton variant="danger" label={t('coach.invites.regenerate')} disabled={snapshot.mutating}
              onPress={() => { setActionsOpen(false); setConfirm({ kind: 'regenerate' }); }} />
            <AppButton variant="secondary" label={t('coach.invites.cancel')} onPress={() => setActionsOpen(false)} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal> : null}
    {sheet ? <CreateInviteCodeSheet type={sheet} busy={snapshot.mutating} failed={snapshot.actionError} onClose={() => setSheet(null)} onCreate={model.createCode} /> : null}
    {confirm ? <Confirmation testID={`coach.invites.${confirm.kind}`} title={t(confirm.kind === 'regenerate' ? 'coach.invites.regenerateTitle' : 'coach.invites.revokeTitle')}
      message={t(confirm.kind === 'regenerate' ? 'coach.invites.regenerateMessage' : 'coach.invites.revokeMessage')} cancelLabel={t('coach.invites.cancel')}
      confirmLabel={t(confirm.kind === 'regenerate' ? 'coach.invites.regenerate' : 'coach.invites.revoke')} busy={snapshot.mutating} onCancel={() => setConfirm(null)} onConfirm={() => void confirmMutation()} /> : null}
  </Screen></GestureHandlerRootView>;
}
