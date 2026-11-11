import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { font, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import type { EffortKind } from './actual-effort';
import { effortExplainerFor } from './effort-explainer';

/** Owns presentation only: opening help never changes the surrounding input draft. */
export function EffortHelpButton({ kind, superscript = false, inline = false }: { kind: EffortKind; superscript?: boolean; inline?: boolean }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t(kind === 'rpe' ? 'training.explainer.rpe.help' : 'training.explainer.rir.help')}
      onPress={() => setOpen(true)} style={[styles.button, superscript && styles.superscript, inline && styles.inline]}>
      <Svg width={superscript || inline ? spacing.point14 : 18} height={superscript || inline ? spacing.point14 : 18} viewBox="0 0 18 18" accessible={false}>
        <Circle cx={9} cy={9} r={7.3} fill="none" stroke={colors.textMuted} strokeWidth={1.4} />
        <Path d="M6.8 6.8a2.2 2.2 0 0 1 4.4 0c0 1.6-2.2 1.6-2.2 3.2M9 12.7v.1" fill="none" stroke={colors.textMuted} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    </Pressable>
    {open ? <EffortExplainerCard kind={kind} onClose={() => setOpen(false)} /> : null}
  </>;
}

function EffortExplainerCard({ kind, onClose }: { kind: EffortKind; onClose: () => void }) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const card = effortExplainerFor(kind);
  return <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: colors.numberPadScrim }]}>
      <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View accessibilityViewIsModal onAccessibilityEscape={onClose}
          style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong }]}>
          <ScrollView bounces={false} contentContainerStyle={[styles.content, { paddingBottom: kind === 'rir' ? 18 : 16 }]}>
            <View style={styles.header}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={{ ...font.body(18, 'semibold'), color: colors.textPrimary }}>{t(card.title)}</Text>
                <Text style={{ ...font.body(13), color: colors.textMuted }}>{t(card.subtitle)}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('training.explainer.close')} onPress={onClose} style={styles.button}>
                <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
            {card.rows.length > 0 ? <View>{card.rows.map(row => <View key={row.value}
              style={[styles.row, { borderColor: colors.borderStrong }]}>
              <Text style={{ ...font.mono(15, 'bold'), color: colors.gold500, width: 40 * Math.max(1, fontScale) }}>{row.value}</Text>
              <Text style={{ ...font.body(15), color: colors.textSecondary, flex: 1 }}>{t(row.copy)}</Text>
            </View>)}</View> : null}
            {card.example ? <View style={[styles.example, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ ...font.body(15), color: colors.textSecondary }}>
                {t(card.example.before)}<Text style={{ color: colors.textMuted }}>{' → '}</Text>
                <Text style={{ ...font.mono(15, 'bold'), color: colors.gold500 }}>{t(card.example.answer)}</Text>
              </Text>
            </View> : null}
            <Text style={{ ...font.body(13), color: colors.textMuted }}>{t(card.footer)}</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  button: { width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Start beyond the intrinsic-width label, borrowing the column gap without overlapping its target.
  inline: { width: 24, height: 22, marginHorizontal: -5, marginVertical: -4 },
  superscript: { position: 'absolute', left: '100%', top: 0, width: spacing.point14, paddingBottom: spacing.point14 },
  overlay: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  card: { maxHeight: '100%', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  content: { paddingTop: 20, paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  heading: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 9, borderTopWidth: 1 },
  example: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
});
