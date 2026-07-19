import { StyleSheet, Text, View } from 'react-native';

import { useSessionStore } from '@/api/session';
import { AppButton, Card, Screen, colors, spacing, typography } from '@/design';

type FeaturePlaceholderScreenProps = {
  title: string;
  showLogout?: boolean;
};

export function FeaturePlaceholderScreen({
  showLogout = false,
  title,
}: FeaturePlaceholderScreenProps) {
  const logout = useSessionStore((state) => state.logout);

  return (
    <Screen>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>W1 实装</Text>
          {showLogout ? (
            <AppButton
              label="退出登录"
              onPress={() => {
                void logout().catch(() => undefined);
              }}
            />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.fgPrimary,
    ...typography.headline,
  },
  detail: {
    color: colors.fgSecondary,
    ...typography.body,
  },
});
