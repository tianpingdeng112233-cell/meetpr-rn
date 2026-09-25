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
    const button = renderer!.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onResponderGrant === 'function',
    )[0];
    act(() => button.props.onResponderGrant());
    act(() => jest.advanceTimersByTime(1_099));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => button.props.onResponderRelease());
    act(() => jest.advanceTimersByTime(2_000));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => button.props.onResponderGrant());
    act(() => jest.advanceTimersByTime(1_100));
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => button.props.onResponderGrant());
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
    const button = renderer!.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onResponderGrant === 'function',
    )[0];
    act(() =>
      button.props.onLayout({
        nativeEvent: { layout: { width: 200, height: 58 } },
      }),
    );
    act(() => button.props.onResponderGrant());
    act(() =>
      button.props.onResponderMove({
        nativeEvent: { locationX: 201, locationY: 20 },
      }),
    );
    act(() => button.props.onResponderGrant());
    act(() => jest.advanceTimersByTime(1_100));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => button.props.onResponderRelease());
    act(() => button.props.onResponderGrant());
    act(() => renderer?.unmount());
    renderer = undefined;
    act(() => jest.advanceTimersByTime(1_100));
    expect(onComplete).not.toHaveBeenCalled();
  } finally {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  }
});

test('the seven hold feedback steps grow from light through medium to heavy', () => {
  const { holdFeedback } = jest.requireActual<typeof import('../hold-to-complete')>('../hold-to-complete');
  expect(Array.from({ length: 7 }, (_, index) => holdFeedback(index + 1).weight)).toEqual(['light', 'light', 'medium', 'medium', 'medium', 'heavy', 'heavy']);
  expect(Array.from({ length: 7 }, (_, index) => holdFeedback(index + 1).intensity)).toEqual([0.5, 0.5, 0.7, 0.775, 0.85, 1, 1]);
});

test('an in-bounds hold survives a parent scroll responder request', () => {
  jest.useFakeTimers();
  const onComplete = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  try {
    act(() => {
      renderer = create(createElement(HoldToCompleteButton, { onComplete }));
    });
    const responder = renderer!.root.findAll(node =>
      node.props.accessibilityRole === 'button' && typeof node.props.onResponderGrant === 'function',
    )[0];
    const event = {
      persist: () => {}, currentTarget: 1,
      nativeEvent: { pageX: 100, pageY: 20, locationX: 100, locationY: 20, timestamp: 0 },
    };
    let blocksNativeScroll: unknown;
    act(() => responder.props.onLayout({ nativeEvent: { layout: { width: 200, height: 58 } } }));
    act(() => { blocksNativeScroll = responder.props.onResponderGrant(event); });
    expect(blocksNativeScroll).toBe(true);
    act(() => jest.advanceTimersByTime(100));
    act(() => responder.props.onResponderMove({ nativeEvent: { locationX: 100, locationY: 32 } }));
    // The enclosing ScrollView requests the responder when the finger moves.
    act(() => {
      if (responder.props.onResponderTerminationRequest()) {
        responder.props.onResponderTerminate(event);
      }
    });
    act(() => jest.advanceTimersByTime(1_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  } finally {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  }
});
