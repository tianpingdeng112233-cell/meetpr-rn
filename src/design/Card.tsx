import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius } from './tokens';

export type CardProps = ViewProps;

export function Card({ style, ...props }: CardProps) {
  return <View style={[styles.root, style]} {...props} />;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
