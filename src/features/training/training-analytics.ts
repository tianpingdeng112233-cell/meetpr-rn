import {
  AnalyticsEvent,
  AnalyticsScreen,
  screen,
  track,
} from '@/analytics';

export async function trackTrainingTabVisit(): Promise<void> {
  await Promise.all([
    screen(AnalyticsScreen.TodayWorkout),
    track(AnalyticsEvent.WorkoutLogStart),
  ]);
}
