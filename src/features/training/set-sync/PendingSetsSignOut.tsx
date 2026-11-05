import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/api/session';
import { AppButton, font, fontMetrics, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { pendingSetCount, useSetSync } from './runtime';

export function PendingSetsSignOut() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const client = useQueryClient();
  const colors = useColors();
  const { queue, snapshot } = useSetSync(studentId);
  const count = pendingSetCount(snapshot.pending);
  const [visible, setVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const loggingOut = useRef(false);
  const logout = async () => {
    if (loggingOut.current || useSessionStore.getState().user?.id !== studentId) return;
    loggingOut.current = true; setBusy(true); setVisible(false); setUploading(false);
    client.clear();
    try { await useSessionStore.getState().logout(); }
    finally { loggingOut.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (uploading && count === 0) void logout();
    // logout reads current session identity; only a pending count change can finish this intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploading, count]);
  const cancel = () => { setUploading(false); setVisible(false); };
  return <>
    <AppButton variant="secondary" icon="logout" label={t('student.myProfileView.copy013')} disabled={busy} onPress={() => {
      void queue.ready.then(() => { if (queue.pending().length) setVisible(true); else return logout(); });
    }} />
    {visible ? <Modal visible transparent animationType="none" onRequestClose={cancel}>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.numberPadScrim }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.card, overflow: 'hidden' }}>
          <View style={{ padding: spacing.xl, gap: spacing.sm }}>
            <Text style={{ ...font.body(fontMetrics.size18, 'bold'), color: colors.textPrimary }}>{t('student.setSync.logoutTitle', [count])}</Text>
            <Text style={{ ...font.body(fontMetrics.size14), color: colors.textSecondary }}>{t('student.setSync.logoutBody')}</Text>
            {uploading ? <View accessibilityRole="progressbar" accessibilityLabel={t('student.setSync.logoutProgress', [count])} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <ActivityIndicator color={colors.goldText} /><Text style={{ color: colors.goldText }}>{t('student.setSync.logoutProgress', [count])}</Text>
            </View> : null}
          </View>
          <SignOutAction label={t('student.setSync.uploadLogout')} primary onPress={() => { setUploading(true); queue.sendNow(undefined, true); }} />
          <SignOutAction label={t('student.setSync.logoutNow')} onPress={() => { void logout(); }} />
          <SignOutAction label={t('student.added.cancel')} onPress={cancel} />
        </View>
      </View>
    </Modal> : null}
  </>;
}

function SignOutAction({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={{ minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderTopWidth: spacing.point1, borderTopColor: colors.borderDefault }}>
    <Text style={{ ...font.body(fontMetrics.size15, primary ? 'bold' : 'regular'), color: primary ? colors.goldText : colors.textPrimary }}>{label}</Text>
  </Pressable>;
}
