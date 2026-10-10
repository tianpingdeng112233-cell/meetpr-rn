import { useState, type ReactNode, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { MeetPRMark, Screen, font, typography, useColors } from '@/design';

import { GlobalAuthBackground } from './GlobalAuthBackground';
import { GlobalAuthField } from './GlobalAuthField';
import { isValidEmail } from './validation';
import { authTypography } from './auth-typography';

export function AuthForm({ children, title, subtitle, brand = false, footer }: PropsWithChildren<{ title: string; subtitle?: string; brand?: boolean; footer?: ReactNode }>) {
  const colors = useColors();
  return <Screen edges={['left', 'right', 'bottom', ...(brand ? ['top'] as const : [])]}>
    <GlobalAuthBackground />
    <KeyboardAvoidingView style={styles.fill} behavior="height">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.form, footer ? { flexGrow: 1 } : undefined]}>
          <View style={styles.heading}>
            <View style={styles.wordmark} accessible={false} accessibilityElementsHidden>
              <MeetPRMark fontSize={15} />
            </View>
            <View>
              <Text style={{ ...font.display(44, 'extraBold'), letterSpacing: -1.1, lineHeight: 44 * 0.95, color: colors.textPrimary, ...(!brand ? authTypography('title') : {}) }}>{title}</Text>
              <View style={{ width: 44, height: 3, borderRadius: 2, backgroundColor: colors.gold500, marginTop: 16 }} />
            </View>
          </View>
          <View style={styles.fields}>
            {subtitle ? <Text style={{ ...font.body(13), ...authTypography(), color: colors.textTertiary }}>{subtitle}</Text> : null}
            {children}
          </View>
          {footer ? <View style={{ marginTop: 'auto', paddingTop: 14 }}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

export function EmailField({ value, onChangeText, editable = true }: { value: string; onChangeText: (value: string) => void; editable?: boolean }) {
  const [blurred, setBlurred] = useState(false);
  return <GlobalAuthField label={t('auth.email')} placeholder={t('auth.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
    value={value} onChangeText={onChangeText} onBlur={() => setBlurred(true)} editable={editable}
    error={blurred && !isValidEmail(value) ? t('auth.invalidEmail') : undefined} />;
}

export function AuthNotice({ message, success = false }: { message: string | null; success?: boolean }) {
  const colors = useColors();
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ ...typography.footnote, ...authTypography(), color: success ? colors.success : colors.danger }}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center' },
  form: { width: '100%', maxWidth: 520, paddingHorizontal: 24, paddingTop: 44, paddingBottom: 26 },
  heading: { gap: 18, alignItems: 'flex-start' },
  wordmark: { width: 15 / 0.34 * 2.05, height: 15 / 0.34, justifyContent: 'center', alignItems: 'flex-start' },
  fields: { gap: 14, marginTop: 24 },
});
