import { SvgXml } from 'react-native-svg';

import { useTheme } from './theme';
import { wordmarkOnDark, wordmarkOnLight } from './wordmark-artwork';

type MeetPRMarkProps = {
  height?: number;
  variant?: 'auto' | 'onLight' | 'onDark';
  testID?: string;
  accessibilityLabel?: string;
};

export function MeetPRMark({ height = 18, variant = 'auto', testID, accessibilityLabel }: MeetPRMarkProps) {
  const { scheme } = useTheme();
  const onDark = variant === 'onDark' || (variant === 'auto' && scheme === 'dark');
  return <SvgXml xml={onDark ? wordmarkOnDark : wordmarkOnLight}
    width={height * 2443 / 605} height={height} testID={testID}
    accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} />;
}
