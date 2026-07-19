import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen, colors, spacing, typography } from '@/design';

export default function ValidatingScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <ActivityIndicator color={colors.brandRed} size="large" />
        <Text style={styles.message}>正在验证会话…</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.base,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    color: colors.fgSecondary,
    ...typography.body,
  },
});
