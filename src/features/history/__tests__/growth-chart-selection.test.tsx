import { expect, test, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { E1RMSample } from '@/domain/e1rm';
import { GrowthE1RMChart } from '../GrowthE1RMChart';
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

test('every real daily point is accessible and opens its own source, including a non-record day', () => {
  const samples: E1RMSample[] = [190, 190, 195].map((valueKg, index) => ({
    sampleId: `p${index}`, winnerPointId: `p${index}`, date: new Date(`2026-09-${10 + index}T12:00:00Z`),
    valueKg, winnerOrigin: 'logged', winnerConfidence: 'normal',
  }));
  const onSelect = jest.fn();
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<GrowthE1RMChart samples={samples} rawEligiblePoints={samples} onSelect={onSelect} />); });
  const buttons = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.testID?.startsWith('growth-point-'), { deep: false });
  expect(buttons).toHaveLength(3);
  act(() => buttons[1].props.onPress());
  expect(onSelect).toHaveBeenCalledWith(samples[1]);
  act(() => renderer.update(<GrowthE1RMChart samples={samples} rawEligiblePoints={samples} selectedPointId={samples[1].winnerPointId} onSelect={onSelect} />));
  expect(renderer.root.findAllByProps({ testID: 'growth-point-p1' })[0].props.accessibilityState.selected).toBe(true);
  expect(renderer.root.findAllByProps({ testID: 'growth-selected-node' }).length).toBeGreaterThan(0);
  act(() => renderer.unmount());
});
