import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useId, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { AppButton, font, radius, useColors, type Colors } from '@/design';
import { RewardEntrance, RewardMedalMotion, RewardShimmer, useRewardCount } from '@/design/TrainingRewardMotion';
import { GradientFill } from '@/design/GradientFill';
import { t } from '@/i18n';
import type { WorkoutCompletionPresentation } from './completion-presentation';

/** Medal geometry is shared by the animated and reduced-motion terminal frame. */
function CelebrationMedal() {
  const colors = useColors();
  const id = useId();
  return (
    <View pointerEvents="none" accessible={false} style={{ width: 110, height: 110 }}>
      <Svg width={110} height={110} viewBox="-7 -3 110 110">
        <Defs>
          <LinearGradient id={`${id}-left`} x2="100%" y2="100%">
            <Stop stopColor={colors.gold500} /><Stop offset={1} stopColor={colors.gold800} />
          </LinearGradient>
          <LinearGradient id={`${id}-right`} x1="100%" x2="0%" y2="100%">
            <Stop stopColor={colors.gold700} /><Stop offset={1} stopColor={colors.gold900} />
          </LinearGradient>
          <LinearGradient id={`${id}-medal`} x2="0%" y2="100%">
            <Stop stopColor={colors.gold200} /><Stop offset={0.55} stopColor={colors.gold500} /><Stop offset={1} stopColor={colors.gold700} />
          </LinearGradient>
          <RadialGradient id={`${id}-shadow`}>
            <Stop stopColor={colors.gold500} stopOpacity={0.45} /><Stop offset={1} stopColor={colors.gold500} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={48} cy={65} rx={55} ry={45} fill={`url(#${id}-shadow)`} />
        <G>
          <Path d="M27 0 H44 L53 39 L38 48 Z" fill={`url(#${id}-left)`} />
          <Path d="M69 0 H52 L43 39 L58 48 Z" fill={`url(#${id}-right)`} />
          <Circle cx={48} cy={72} r={29} fill={`url(#${id}-medal)`} />
          <Circle cx={48} cy={72} r={22} fill={colors.holdTrack} fillOpacity={0.92} stroke={colors.gold200} strokeOpacity={0.35} strokeWidth={1} />
          <Path d="M37.5 73 L45.5 80.5 L59.5 62" fill="none" stroke={colors.gold400} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
    </View>
  );
}

export function WorkoutCelebrationView({ presentation, streak = null, onOpenReview, onFinish, saving = false }: {
  presentation: WorkoutCompletionPresentation;
  streak?: number | null;
  onOpenReview: () => void;
  onFinish: () => void;
  saving?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const glowId = useId();
  const completedCount = useRewardCount(presentation.completedSuccessfulSets);
  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
        <Svg width={width} height={height}>
          <Defs><RadialGradient id={glowId} cx="50%" cy="100%" rx="50%" ry="50%">
            <Stop stopColor={colors.goldRGB} stopOpacity={0.20} />
            <Stop offset={0.48} stopColor={colors.goldRGB} stopOpacity={0.06} />
            <Stop offset={0.72} stopColor={colors.goldRGB} stopOpacity={0} />
          </RadialGradient></Defs>
          <Ellipse cx={width / 2} cy={height * 0.75} rx={width * 0.7} ry={height * 0.35} fill={`url(#${glowId})`} />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RewardMedalMotion><CelebrationMedal /></RewardMedalMotion>
        <RewardEntrance delay={140}><Text style={styles.title}>{t('student.workoutCompletionFlowView.copy001')}</Text></RewardEntrance>
        <RewardEntrance delay={240} style={styles.receipt}>
          <View style={styles.coachMark}>
            <GradientFill direction="diagonal" stops={[{ color: colors.textGhost, offset: 0 }, { color: colors.surfaceKey, offset: 1 }]} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.coachInitial}>{t('student.workoutCompletionFlowView.copy004')}</Text>
          </View>
          <Text style={styles.receiptText}>{presentation.coachReceiptText}</Text>
        </RewardEntrance>
        <View style={styles.stats}>
          <RewardEntrance delay={340} slide style={styles.stat}><Text style={styles.value}>{presentation.weekCode}</Text><Text style={styles.label}>{presentation.weekDayLabel}</Text></RewardEntrance>
          <View style={styles.divider} />
          <RewardEntrance delay={470} slide style={styles.stat}>
            <View style={styles.statValue}><Text accessibilityLabel={String(presentation.completedSuccessfulSets)} style={styles.value}>{completedCount}</Text><Text style={styles.suffix}>{t('student.workoutCompletionFlowView.copy005', [presentation.totalPlannedSets])}</Text></View>
            <Text style={styles.label}>{presentation.setCompletionLabel}</Text>
          </RewardEntrance>
        </View>
        <RewardEntrance delay={600} slide><Text style={styles.meta}>{presentation.metaText}</Text></RewardEntrance>
        {streak !== null ? <RewardEntrance delay={730} slide style={styles.streak}><MaterialCommunityIcons name="fire" size={14} color={colors.gold500} /><Text style={styles.streakText}>{t('student.workoutCompletionFlowView.copy007', [streak])}</Text></RewardEntrance> : null}
        <RewardEntrance delay={820} style={styles.buttons}>
          <View style={{ borderRadius: radius.control, overflow: 'hidden' }}><AppButton haptic="none" variant="primary" fullWidth={false} label={t('student.workoutCompletionFlowView.copy002')} onPress={onOpenReview} disabled={saving} /><RewardShimmer /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.workoutCompletionFlowView.copy003')} disabled={saving} onPress={onFinish} style={({ pressed }) => [styles.finish, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}><Text style={styles.finishText}>{t('student.workoutCompletionFlowView.copy003')}</Text></Pressable>
        </RewardEntrance>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },
  title: { ...font.display(26), color: colors.textPrimary, marginTop: 22, textAlign: 'center' },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  coachMark: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1, borderColor: `${colors.goldRGB}66`, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coachInitial: { ...font.body(10, 'bold'), color: colors.goldText },
  receiptText: { ...font.body(12), color: colors.textSecondary, flexShrink: 1 },
  stats: { flexDirection: 'row', width: '100%', maxWidth: 300, marginTop: 30 },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  statValue: { flexDirection: 'row', alignItems: 'baseline' },
  value: { ...font.display(34), color: colors.goldText },
  suffix: { ...font.display(15), color: colors.goldMuted },
  label: { ...font.mono(11), color: colors.textMuted, textAlign: 'center' },
  divider: { width: 1, backgroundColor: colors.surfaceRaised },
  meta: { ...font.mono(12), color: colors.textMuted, marginTop: 18, textAlign: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: `${colors.goldRGB}1A`, borderColor: `${colors.goldRGB}4D`, borderWidth: 1 },
  streakText: { ...font.body(12, 'bold'), color: colors.goldText },
  buttons: { alignItems: 'center', gap: 14, marginTop: 34, paddingHorizontal: 24 },
  finish: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  finishText: { ...font.body(13), color: colors.textMuted },
});
