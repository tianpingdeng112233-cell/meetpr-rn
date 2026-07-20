import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSessionStore } from '@/api/session';
import { Card, Screen, colors, spacing, typography } from '@/design';

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
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void logout().catch(() => undefined);
              }}
              style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
              <MaterialCommunityIcons color={colors.brandRed} name="logout" size={20} />
              <Text style={styles.logoutLabel}>退出登录</Text>
            </Pressable>
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
  logout: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  logoutPressed: {
    opacity: 0.6,
  },
  logoutLabel: {
    color: colors.brandRed,
    fontSize: 15,
    fontWeight: '600',
  },
});
