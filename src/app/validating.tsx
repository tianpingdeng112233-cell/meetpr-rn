import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen, useColors, spacing } from '@/design';

export default function ValidatingScreen() {
  const colors = useColors();
  return (
    <Screen>
      <View style={styles.content}>
        {/* Cold start hides this behind the launch splash (spec 099). */}
        <ActivityIndicator color={colors.gold500} size="large" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
