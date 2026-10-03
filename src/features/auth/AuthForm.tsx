import { useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MeetPRMark, Screen, font, typography, useColors } from '@/design';

import { GlobalAuthBackground } from './GlobalAuthBackground';
import { GlobalAuthField } from './GlobalAuthField';
import { isValidEmail } from './validation';

export function AuthForm({ children, title, subtitle, brand = false }: PropsWithChildren<{ title: string; subtitle?: string; brand?: boolean }>) {
  const colors = useColors();
  return <Screen edges={['left', 'right', 'bottom', ...(brand ? ['top'] as const : [])]}>
    <GlobalAuthBackground />
    <KeyboardAvoidingView style={styles.fill} behavior="height">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <View style={styles.heading}>
            <MeetPRMark fontSize={15} />
            <View>
              <Text style={{ ...font.display(44, 'extraBold'), letterSpacing: -1.1, lineHeight: 44 * 0.95, color: colors.textPrimary }}>{title}</Text>
              <View style={{ width: 44, height: 3, borderRadius: 2, backgroundColor: colors.gold500, marginTop: 16 }} />
            </View>
          </View>
          <View style={styles.fields}>
            {subtitle ? <Text style={{ ...font.body(13), color: colors.textTertiary }}>{subtitle}</Text> : null}
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

export function EmailField({ value, onChangeText, editable = true }: { value: string; onChangeText: (value: string) => void; editable?: boolean }) {
  const [blurred, setBlurred] = useState(false);
  return <GlobalAuthField label="EMAIL" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
    value={value} onChangeText={onChangeText} onBlur={() => setBlurred(true)} editable={editable}
    error={blurred && !isValidEmail(value) ? 'Enter a valid email address' : undefined} />;
}

export function AuthNotice({ message, success = false }: { message: string | null; success?: boolean }) {
  const colors = useColors();
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ ...typography.footnote, color: success ? colors.success : colors.danger }}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center' },
  form: { width: '100%', maxWidth: 520, paddingHorizontal: 24, paddingTop: 44, paddingBottom: 26 },
  heading: { gap: 18, alignItems: 'flex-start' },
  fields: { gap: 14, marginTop: 24 },
});
