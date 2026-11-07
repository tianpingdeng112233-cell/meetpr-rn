import { getCalendars } from 'expo-localization';
import { Text } from 'react-native';
import { font, useColors } from '@/design';
import { getLocale } from '@/i18n';

/** Keep native clock preferences at the UI boundary; the grouping function stays pure. */
export function chatTimeLocale(): string {
  const locale = getLocale();
  const uses24hourClock = getCalendars()[0]?.uses24hourClock;
  return locale === 'en' && uses24hourClock != null ? `${locale}-u-hc-${uses24hourClock ? 'h23' : 'h12'}` : locale;
}

export function ChatTimeSeparator({ label }: { label?: string }) {
  const colors = useColors();
  return label ? <Text style={{ ...font.body(11), color: colors.textDim, textAlign: 'center', paddingBottom: 4 }}>{label}</Text> : null;
}
