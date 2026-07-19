import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { screen, track } from '@/analytics';

import { trackTrainingTabVisit } from '../training-analytics';

jest.mock('@/analytics', () => ({
  AnalyticsEvent: { WorkoutLogStart: 'workout_log_start' },
  AnalyticsScreen: { TodayWorkout: 'today_workout' },
  screen: jest.fn(() => Promise.resolve()),
  track: jest.fn(() => Promise.resolve()),
}));

const mockScreen = jest.mocked(screen);
const mockTrack = jest.mocked(track);

describe('training tab analytics placement', () => {
  beforeEach(() => {
    mockScreen.mockClear();
    mockTrack.mockClear();
  });

  test('emits screen and workout_log_start on every tab entry without date dedupe', async () => {
    await trackTrainingTabVisit();
    await trackTrainingTabVisit();

    expect(mockScreen).toHaveBeenNthCalledWith(1, 'today_workout');
    expect(mockScreen).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenNthCalledWith(1, 'workout_log_start');
    expect(mockTrack).toHaveBeenCalledTimes(2);
  });
});
