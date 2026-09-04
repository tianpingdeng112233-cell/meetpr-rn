import { useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen, TextField, font, useColors } from '@/design';

import { isValidEmail } from './validation';

export function AuthForm({ children, title, subtitle, brand = false }: PropsWithChildren<{ title: string; subtitle?: string; brand?: boolean }>) {
  const colors = useColors();
  return <Screen edges={['left', 'right', 'bottom', ...(brand ? ['top'] as const : [])]}>
    <KeyboardAvoidingView style={styles.fill} behavior="height">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          {brand ? <Text style={{ ...font.display(24, 'extraBold'), color: colors.textPrimary }}>MeetPR</Text> : null}
          <Text style={{ ...font.display(40, 'black'), letterSpacing: -0.7, color: colors.textPrimary }}>{title}</Text>
          {subtitle ? <Text style={{ ...font.body(16), color: colors.textSecondary }}>{subtitle}</Text> : null}
          <View style={{ width: 48, height: 3, borderRadius: 2, backgroundColor: colors.gold500, marginTop: 8 }} />
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

export function EmailField({ value, onChangeText, editable = true }: { value: string; onChangeText: (value: string) => void; editable?: boolean }) {
  const [blurred, setBlurred] = useState(false);
  return <TextField label="EMAIL" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
    value={value} onChangeText={onChangeText} onBlur={() => setBlurred(true)} editable={editable}
    error={blurred && !isValidEmail(value) ? 'Enter a valid email address' : undefined} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 24, padding: 20 },
  heading: { gap: 12 },
});
