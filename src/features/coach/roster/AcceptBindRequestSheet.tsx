import { Modal, ScrollView, View } from 'react-native';
import { AppButton, Card, Screen, spacing, useColors } from '@/design';
import type { CoachApplication } from '@/api/domains/coach';
import { t } from '@/i18n';
import { Action, Copy } from '../ui';
export function AcceptBindRequestSheet({ item, busy, onClose, onConfirm }: { item: CoachApplication | null; busy: boolean; onClose(): void; onConfirm(): void }) {
  const colors = useColors();
  return <Modal visible={item !== null} transparent animationType="slide" onRequestClose={busy ? undefined : onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalShadow }}><Card elevation="modal" style={{ maxHeight: '90%', minHeight: '50%', padding: 0 }}><Screen edges={['bottom']} style={{ flex: 0, backgroundColor: 'transparent', padding: spacing.space5 }}>
      <View style={{ justifyContent: 'center', minHeight: spacing.minimumHitTarget }}>
        <Copy size={16} weight="bold" style={{ textAlign: 'center', paddingHorizontal: spacing.point56 }} lines={1}>{t('coach.bind.accept.title')}</Copy>
        <Action label={t('coach.common.cancel')} onPress={onClose} disabled={busy} style={{ position: 'absolute', right: 0, paddingHorizontal: spacing.space2 }} />
      </View>
      <ScrollView contentContainerStyle={{ gap: spacing.space5, paddingVertical: spacing.space6 }}><Copy size={17} weight="semibold">{t('coach.bind.accept.confirmQuestion', [item?.displayName ?? ''])}</Copy><Copy size={13} tone="textTertiary">{t('coach.bind.accept.explanation')}</Copy><AppButton label={t('coach.bind.accept.confirm')} loading={busy} onPress={onConfirm} /></ScrollView>
    </Screen></Card></View>
  </Modal>;
}
