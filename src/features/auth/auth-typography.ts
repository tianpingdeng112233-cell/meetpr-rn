import { type TextStyle } from 'react-native';

import { fontNames } from '@/design/fonts';
import { getLocale } from '@/i18n';

type AuthText = 'body' | 'title' | 'label' | 'button' | 'code';

export function authTypography(kind: AuthText = 'body'): TextStyle {
  if (getLocale() !== 'zh') return {};
  const regular: TextStyle = { fontFamily: undefined, fontWeight: '400' };
  switch (kind) {
    case 'title': return { ...regular, fontWeight: '500', fontSize: 30, lineHeight: 40, letterSpacing: 1 };
    case 'label': return { ...regular, fontSize: 12, letterSpacing: 0.5 };
    case 'button': return { ...regular, fontWeight: '500', fontSize: 16, letterSpacing: 1 };
    case 'code': return { fontFamily: fontNames.mono.regular, fontWeight: '400', fontSize: 17, letterSpacing: 2 };
    default: return regular;
  }
}
