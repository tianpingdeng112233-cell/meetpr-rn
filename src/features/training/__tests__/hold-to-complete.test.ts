import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
import { test, expect, jest } from '@jest/globals';
import { holdTransition, completionAvailability } from '../hold-to-complete';
jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
test('hold cancels until release, cannot restart after moving back inside', () => {
  expect(holdTransition('idle', 'begin')).toBe('holding');
  expect(holdTransition('holding', 'cancel')).toBe('cancelledUntilEnded');
  expect(holdTransition('cancelledUntilEnded', 'begin')).toBe(
    'cancelledUntilEnded',
  );
  expect(holdTransition('cancelledUntilEnded', 'complete')).toBe(
    'cancelledUntilEnded',
  );
  expect(holdTransition('cancelledUntilEnded', 'reset')).toBe('idle');
});
test('complete fires once and resets on release', () => {
  expect(holdTransition('holding', 'complete')).toBe('completedUntilEnded');
  expect(holdTransition('completedUntilEnded', 'begin')).toBe(
    'completedUntilEnded',
  );
  expect(holdTransition('completedUntilEnded', 'reset')).toBe('idle');
  expect(holdTransition('holding', 'reset')).toBe('idle');
});
test('zero real groups cannot complete; all logged hides remaining pill but keeps button', () => {
  expect(
    completionAvailability({
      editable: true,
      recording: true,
      realCount: 0,
      remainingSets: 5,
    }),
  ).toEqual({ button: false, pill: false });
  expect(
    completionAvailability({
      editable: true,
      recording: true,
      realCount: 1,
      remainingSets: 4,
    }),
  ).toEqual({ button: true, pill: true });
  expect(
    completionAvailability({
      editable: true,
      recording: true,
      realCount: 5,
      remainingSets: 0,
    }),
  ).toEqual({ button: true, pill: false });
  expect(
    completionAvailability({
      editable: false,
      recording: true,
      realCount: 5,
      remainingSets: 0,
    }).button,
  ).toBe(false);
});

test('native hold completes exactly once at 1.10s and an early release cancels', () => {
  jest.useFakeTimers();
  const onComplete = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  try {
    act(() => {
      renderer = create(createElement(HoldToCompleteButton, { onComplete }));
    });
    const button = renderer!.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPressIn === 'function',
    );
    act(() => button.props.onPressIn());
    act(() => jest.advanceTimersByTime(1_099));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => button.props.onTouchEnd());
    act(() => jest.advanceTimersByTime(2_000));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => button.props.onPressIn());
    act(() => jest.advanceTimersByTime(1_100));
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => button.props.onPressIn());
    act(() => jest.advanceTimersByTime(2_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  } finally {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  }
});
test('moving outside cancels until release, and unmount never completes a pending hold', () => {
  jest.useFakeTimers();
  const onComplete = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  try {
    act(() => {
      renderer = create(createElement(HoldToCompleteButton, { onComplete }));
    });
    const button = renderer!.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPressIn === 'function',
    );
    act(() =>
      button.props.onLayout({
        nativeEvent: { layout: { width: 200, height: 58 } },
      }),
    );
    act(() => button.props.onPressIn());
    act(() =>
      button.props.onTouchMove({
        nativeEvent: { locationX: 201, locationY: 20 },
      }),
    );
    act(() => button.props.onPressIn());
    act(() => jest.advanceTimersByTime(1_100));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => button.props.onTouchEnd());
    act(() => button.props.onPressIn());
    act(() => renderer?.unmount());
    renderer = undefined;
    act(() => jest.advanceTimersByTime(1_100));
    expect(onComplete).not.toHaveBeenCalled();
  } finally {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  }
});
