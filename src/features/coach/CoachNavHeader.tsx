import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, spacing, useColors } from '@/design';
import { t } from '@/i18n';

type CoachNavHeaderProps = {
  title: string;
  subtitle?: string;
  subtitleTone?: keyof ReturnType<typeof useColors>;
  onBack?: () => void;
  trailing?: ReactNode;
  subtitleTestID?: string;
};

function goBack() {
  if (router.canGoBack()) router.back();
  else router.navigate('/(coach)/(tabs)/today');
}

export function CoachNavHeader({ title, subtitle, subtitleTone = 'textTertiary', onBack = goBack, trailing, subtitleTestID }: CoachNavHeaderProps) {
  const colors = useColors();
  return <View style={{ height: spacing.point56, paddingHorizontal: spacing.space3, flexDirection: 'row', alignItems: 'center' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('coach.videoFeedback.back')} onPress={onBack} style={{ width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
    </Pressable>
    <View style={{ flex: 1, gap: spacing.point2 }}>
      <Text accessibilityRole="header" numberOfLines={1} style={{ ...font.body(16, 'bold'), color: colors.textPrimary, textAlign: 'center' }}>{title}</Text>
      {subtitle ? <Text testID={subtitleTestID} numberOfLines={1} style={{ ...font.body(11), color: colors[subtitleTone], textAlign: 'center' }}>{subtitle}</Text> : null}
    </View>
    <View style={{ width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>{trailing}</View>
  </View>;
}
