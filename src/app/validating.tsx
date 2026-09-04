import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen, useColors, type Colors, spacing, typography } from '@/design';

export default function ValidatingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Screen>
      <View style={styles.content}>
        <ActivityIndicator color={colors.gold500} size="large" />
        <Text style={styles.message}>正在验证会话…</Text>
      </View>
    </Screen>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.base,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    color: colors.textSecondary,
    ...typography.body,
  },
});
