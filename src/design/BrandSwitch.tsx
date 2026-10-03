import { Switch, type SwitchProps } from 'react-native';
import { useColors } from './theme';

export function BrandSwitch(props: Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>) {
  const colors = useColors();
  return <Switch {...props}
    trackColor={{ true: colors.gold500, false: colors.borderStrong }}
    thumbColor={props.value ? colors.gold200 : colors.textMuted}
    ios_backgroundColor={colors.borderStrong}
  />;
}
