import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { Card, spacing } from '@/design';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { ProgressMenuRow } from '@/features/history/ProgressMenuRow';
import { ProfilePageRow } from '../ProfilePage';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test.each(['menu', 'settings'])('%s omits an empty value without changing the button label or minimum height', kind => {
  act(() => { renderer = create(kind === 'menu'
    ? <ProgressMenuRow title="Settings" value="" icon="tune-variant" onPress={() => {}} />
    : <ProfilePageRow singleLine title="Settings" value="" onPress={() => {}} />); });
  expect(renderer.root.findAllByType(Text).filter(node => node.props.children === '')).toHaveLength(0);
  const button = renderer.root.findByType(FeedbackPressable);
  expect(button.props.accessibilityLabel).toBe('Settings');
  expect(button.props.accessibilityRole).toBe('button');
  const styled = kind === 'menu' ? renderer.root.findByType(Card) : button;
  expect(StyleSheet.flatten(styled.props.style).minHeight).toBe(kind === 'menu' ? spacing.minimumHitTarget + spacing.space6 : spacing.point56);
});
test.each(['menu', 'settings'])('%s allows the complete value to wrap below the unshrinking title and keeps its accessible label', kind => {
  const onPress = jest.fn();
  act(() => { renderer = create(kind === 'menu'
    ? <ProgressMenuRow title="Health & recovery" value="1 injury" icon="heart-outline" onPress={onPress} />
    : <ProfilePageRow singleLine title="Rest between sets" value="Automatic (by RPE)" onPress={onPress} />); });
  const title = kind === 'menu' ? 'Health & recovery' : 'Rest between sets';
  const value = kind === 'menu' ? '1 injury' : 'Automatic (by RPE)';
  const nodes = renderer.root.findAllByType(Text);
  const titleNode = nodes.find(node => node.props.children === title)!;
  const valueNode = nodes.find(node => node.props.children === value)!;
  expect(titleNode.props.numberOfLines).toBe(1);
  expect(StyleSheet.flatten(titleNode.props.style).flexShrink).toBe(0);
  expect(valueNode.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(valueNode.props.style)).toMatchObject({ flexShrink: 0, maxWidth: '100%' });
  expect(valueNode.props.android_hyphenationFrequency).toBe('none');
  expect(StyleSheet.flatten(valueNode.parent!.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' });
  const button = renderer.root.findByType(FeedbackPressable);
  expect(button.props.accessibilityLabel).toBe(`${title}, ${value}`);
  act(() => button.props.onPress()); expect(onPress).toHaveBeenCalledTimes(1);
});
