import { expect, test, jest } from '@jest/globals';
import { render, renderer, texts, seedLogs, textOf, button, mockNavigate } from '../test-support/progress-screen';
import { exercisesRepository, setsRepository, setKeys } from '@/api/domains';
import { QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { font, spacing } from '@/design';
import { ProgressPageHeader } from '../ProgressPageHeader';
import { t } from '@/i18n';
import { TrainingHistoryScreen } from '../TrainingHistoryScreen';
import { HistoryEntriesView } from '../HistoryEntriesView';
import { E1RMScreen } from '../E1RMScreen';
import { IntensityScreen } from '../IntensityScreen';
import { VolumeIntensityChart } from '../VolumeIntensityChart';

const statKeys = ['student.trainingHistoryView.copy018', 'student.trainingHistoryView.copy019', 'student.trainingHistoryView.copy020'] as const;
test('history stack shows three empty stat tiles above the unchanged empty list', async () => {
  await render(<TrainingHistoryScreen />);
  for (const key of statKeys) {
    const label = renderer.root.findAllByType(Text).find(node => textOf(node) === t(key))!;
    expect(label).toBeDefined();
    expect(textOf(label.parent!)).toContain('—');
  }
  expect(texts()).toContain(t('student.e1rmSourceHistoryEmpty'));
  expect(texts().indexOf(t(statKeys[0]))).toBeLessThan(texts().indexOf(t('student.e1rmSourceHistoryEmpty')));
});

test('history stack moves session/week/volume totals unchanged', async () => {
  seedLogs();
  await render(<TrainingHistoryScreen />);
  for (const [index, value] of ['3', '2', '1,500'].entries()) {
    const label = renderer.root.findAllByType(Text).find(node => textOf(node) === t(statKeys[index]))!;
    expect(textOf(label.parent!)).toContain(value);
  }
});

test('modal history presentation does not gain stat tiles', async () => {
  await render(<HistoryEntriesView visible weeks={[]} onClose={() => {}} />);
  for (const key of statKeys) expect(texts()).not.toContain(t(key));
});

test('intensity retains the locked explanation before three sessions', async () => {
  await render(<IntensityScreen />);
  expect(texts()).toContain(t('student.volumeIntensityChart.copy003'));
  expect(texts()).toContain(t('student.trainingHistoryView.copy008'));
});

test('three completed days unlock the existing intensity chart and both legends', async () => {
  seedLogs();
  await render(<IntensityScreen />);
  expect(texts()).not.toContain(t('student.volumeIntensityChart.copy003'));
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === t('student.volumeIntensityChart.copy004', [2])).length).toBeGreaterThan(0);
  expect(renderer.root.findByType(VolumeIntensityChart).props.series.points).toHaveLength(2);
  expect(texts()).toContain(t('student.volumeIntensityChart.copy001'));
  expect(texts()).toContain(t('student.volumeIntensityChart.copy002'));
});

test.each([TrainingHistoryScreen, IntensityScreen, E1RMScreen])('%p retains back navigation, loading, failure and retry', async Component => {
  jest.mocked(exercisesRepository.list).mockReturnValue(new Promise(() => {}));
  await render(<Component />);
  expect(texts()).toContain(t('student.trainingHistoryView.copy021'));
  act(() => button(t('student.feedbackInboxView.copy005')).props.onPress());
  expect(mockNavigate).toHaveBeenCalled();
  const client = renderer.root.findByType(QueryClientProvider).props.client;
  jest.mocked(setsRepository.range).mockRejectedValue(new Error('Offline'));
  await act(async () => { await client.invalidateQueries({ queryKey: setKeys.all }); await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).toContain(t('student.trainingHistoryView.copy022'));
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: [] });
  jest.mocked(exercisesRepository.list).mockResolvedValue({ exercises: [] });
  await act(async () => { await client.cancelQueries(); button(t('student.trainingHistoryView.copy023')).props.onPress(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).not.toContain(t('student.trainingHistoryView.copy022'));
});


test.each([TrainingHistoryScreen, IntensityScreen, E1RMScreen])('%p places its title directly after the accessible back button', async Component => {
  await render(<Component />);
  const header = renderer.root.findByType(ProgressPageHeader);
  const title = header.findAllByType(Text).find(node => textOf(node) === header.props.title)!;
  expect(StyleSheet.flatten(title.props.style)).toMatchObject({ textAlign: 'left', ...font.body(19, 'bold') });
  expect(title.parent!.children).toHaveLength(2);
  expect(title.parent!.children[1]).toBe(title);
  const back = button(t('student.feedbackInboxView.copy005'));
  expect(StyleSheet.flatten(back.props.style)).toMatchObject({ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget });
  act(() => back.props.onPress());
  expect(mockNavigate).toHaveBeenCalled();
});
