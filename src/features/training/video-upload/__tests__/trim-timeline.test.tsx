import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { TrimTimeline } from '../TrimTimeline';
import { createTrimSelection, moveTrimStart, moveTrimEnd } from '../trim-selection';
import { t } from '@/i18n';
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });
const event = (pageX: number, locationX = pageX - 100) => ({ nativeEvent: { pageX, locationX } });

test('filmstrip taps and drags scrub the whole source while handle targets take priority', () => {
  const onScrub = jest.fn();
  const onMove = jest.fn();
  const onDraggingChange = jest.fn();
  const selection = moveTrimEnd(moveTrimStart(createTrimSelection(8, 120), 2), 6);
  act(() => { renderer = create(<TrimTimeline selection={selection} thumbnails={[]} enabled position={4} onMove={onMove} onScrub={onScrub} onDraggingChange={onDraggingChange} />); });
  act(() => renderer.root.findAllByType(View).find(n => n.props.onLayout)!.props.onLayout({ nativeEvent: { layout: { width: 444 } } }));
  const scrubber = () => renderer.root.findByProps({ testID: 'trim-scrubber' });
  act(() => {
    expect(scrubber().props.onStartShouldSetResponder(event(322))).toBe(true);
    scrubber().props.onResponderGrant(event(322));
  });
  expect(onScrub).toHaveBeenLastCalledWith(4, false);
  expect(onDraggingChange).toHaveBeenLastCalledWith(true);
  act(() => scrubber().props.onResponderMove(event(172)));
  expect(onScrub).toHaveBeenLastCalledWith(1, false);
  act(() => scrubber().props.onResponderRelease(event(147)));
  expect(onScrub).toHaveBeenLastCalledWith(0.5, true);
  expect(onDraggingChange).toHaveBeenLastCalledWith(false);
  expect(renderer.root.findAllByProps({ testID: 'trim-time-bubble' })).toHaveLength(0);
  expect(scrubber().props.onStartShouldSetResponder(event(222))).toBe(false);
  const handle = renderer.root.findAllByType(View).find(n => n.props.accessibilityLabel === t('student.videoTrimTimeline.copy003'))!;
  const count = onScrub.mock.calls.length;
  act(() => {
    handle.props.onStartShouldSetResponder(event(222));
    handle.props.onResponderGrant(event(222));
    handle.props.onResponderMove(event(247));
  });
  expect(onMove).toHaveBeenLastCalledWith('start', 2.5);
  expect(onScrub).toHaveBeenCalledTimes(count);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('00:02.00');
  act(() => handle.props.onResponderRelease(event(247)));
  expect(onMove).toHaveBeenLastCalledWith('start', 2.5);
});

test('playhead accessibility adjusts by one second and disabled tools ignore touch and accessibility', () => {
  const onScrub = jest.fn();
  const onMove = jest.fn();
  const render = (enabled: boolean, position: number) => <TrimTimeline selection={createTrimSelection(8, 120)} thumbnails={[]} enabled={enabled} position={position} onMove={onMove} onScrub={onScrub} />;
  act(() => { renderer = create(render(true, 4)); });
  const scrubber = () => renderer.root.findByProps({ testID: 'trim-scrubber' });
  expect(scrubber().props.accessibilityRole).toBe('adjustable');
  expect(scrubber().props.accessibilityLabel).toBe(t('student.videoTrimTimeline.copy002'));
  act(() => scrubber().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
  expect(onScrub).toHaveBeenLastCalledWith(5, true);
  act(() => scrubber().props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
  expect(onScrub).toHaveBeenLastCalledWith(3, true);
  act(() => renderer.update(render(true, 8)));
  act(() => scrubber().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
  expect(onScrub).toHaveBeenLastCalledWith(8, true);
  act(() => renderer.update(render(false, 4)));
  onScrub.mockClear();
  act(() => {
    expect(scrubber().props.onStartShouldSetResponder(event(322))).toBe(false);
    scrubber().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  });
  expect(onScrub).not.toHaveBeenCalled();
  expect(onMove).not.toHaveBeenCalled();
});
